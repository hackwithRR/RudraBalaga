// notifications.js — Real-time in-app notification center (Tier 1)
// - Firestore-backed `notifications` collection (one doc per recipient)
// - Bell + unread badge injected into the header of every page
// - Slide-in notification panel with mark-as-read
// - Live toast popups for newly-arriving notifications (onSnapshot)
// - Client-side "day before" / same-day event reminders (deduped per user+event)
// Shared by index.html, events.html, essentials.html, bus-routes.html, profile.html and admin.html.
// Load AFTER firebase-config.js. All Firebase calls fail-soft (never blocks the page).

(function () {
    'use strict';

    // Notification types -> icon shown in the bell panel / toasts
    var NOTIF_TYPES = {
        event_new:          { icon: 'event_available',    label: 'New event' },
        event_updated:      { icon: 'edit_calendar',      label: 'Event updated' },
        payment_submitted:  { icon: 'pending_actions',    label: 'Payment submitted' },
        payment_approved:   { icon: 'check_circle',       label: 'Payment approved' },
        payment_rejected:   { icon: 'cancel',             label: 'Payment rejected' },
        donation_submitted: { icon: 'volunteer_activism', label: 'Donation submitted' },
        donation_approved:  { icon: 'volunteer_activism', label: 'Donation approved' },
        donation_rejected:  { icon: 'cancel',             label: 'Donation rejected' },
        bus_info:           { icon: 'directions_bus',     label: 'Bus update' },
        announcement:       { icon: 'campaign',           label: 'Announcement' },
        reminder:           { icon: 'alarm',              label: 'Reminder' }
    };

    var BATCH_LIMIT = 450; // Firestore batch write limit is 500; keep headroom

    var state = {
        uid: null,
        isAdmin: false,
        notifications: [],      // sorted newest-first
        unreadCount: 0,
        unsubscribe: null,
        firstSnapshotSeen: false,
        bellEl: null,
        badgeEl: null,
        panelEl: null,
        panelOpen: false
    };

    function db() {
        return (typeof window.firebaseDb !== 'undefined' && window.firebaseDb) ? window.firebaseDb : null;
    }

    function serverTimestamp() {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
                return firebase.firestore.FieldValue.serverTimestamp();
            }
        } catch (e) { /* SDK not ready — store null */ }
        return null;
    }

    function esc(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function typeMeta(type) {
        return NOTIF_TYPES[type] || { icon: 'notifications', label: 'Notification' };
    }

    // "Sat, 3 Oct 2026" — used for event notification bodies
    function formatEventDate(dateStr) {
        try {
            var d = new Date(dateStr + (dateStr && String(dateStr).length === 10 ? 'T00:00:00' : ''));
            if (isNaN(d.getTime())) return String(dateStr || '');
            return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) {
            return String(dateStr || '');
        }
    }

    // Relative time for panel rows: "just now", "5m ago", "3h ago", "2d ago" or date
    function relativeTime(ts, receivedAt) {
        var ms = null;
        if (ts && typeof ts.toDate === 'function') {
            var d = ts.toDate();
            if (!isNaN(d.getTime())) ms = d.getTime();
        } else if (ts && typeof ts === 'object' && typeof ts.seconds === 'number') {
            ms = ts.seconds * 1000;
        }
        if (ms == null) ms = receivedAt || Date.now();
        var diff = Date.now() - ms;
        if (diff < 60 * 1000) return 'just now';
        if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + 'h ago';
        if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / 86400000) + 'd ago';
        return formatEventDate(new Date(ms).toISOString().slice(0, 10));
    }

    function notifTimeMs(n) {
        if (n && n.createdAt && typeof n.createdAt.toMillis === 'function') {
            try { return n.createdAt.toMillis(); } catch (e) { /* fall through */ }
        }
        return n && n.__receivedAt ? n.__receivedAt : 0;
    }

    // ------------------------------------------------------------------
    // Writing notifications (used by admin hooks + member reminders)
    // Payload: { type, title, body, eventId }
    // ------------------------------------------------------------------
    function writeForUid(uid, payload, docId) {
        var database = db();
        if (!database || !uid || !payload || !payload.type || !payload.title) {
            return Promise.resolve();
        }
        var data = {
            uid: uid,
            type: String(payload.type),
            title: String(payload.title),
            body: String(payload.body || ''),
            eventId: payload.eventId || null,
            read: false,
            createdAt: serverTimestamp()
        };
        try {
            if (docId) {
                return database.collection('notifications').doc(docId).set(data);
            }
            return database.collection('notifications').add(data);
        } catch (e) {
            console.warn('[Notifications] write failed:', e && e.message);
            return Promise.resolve();
        }
    }

    function notifyUser(uid, payload) {
        return writeForUid(uid, payload);
    }

    // Fan out one doc per recipient (batched). Keeps reads per-user + per-user read state.
    function notifyUsers(payload) {
        var database = db();
        if (!database || !payload || !Array.isArray(payload.uids) || !payload.uids.length) {
            return Promise.resolve();
        }
        var uids = payload.uids.filter(Boolean);
        var batches = [];
        for (var i = 0; i < uids.length; i += BATCH_LIMIT) {
            var batch = database.batch();
            uids.slice(i, i + BATCH_LIMIT).forEach(function (uid) {
                batch.set(database.collection('notifications').doc(), {
                    uid: uid,
                    type: String(payload.type),
                    title: String(payload.title),
                    body: String(payload.body || ''),
                    eventId: payload.eventId || null,
                    read: false,
                    createdAt: serverTimestamp()
                });
            });
            batches.push(batch);
        }
        // Commit sequentially to be gentle on Firestore
        return batches.reduce(function (chain, b) {
            return chain.then(function () {
                return b.commit().catch(function (err) {
                    console.warn('[Notifications] batch commit failed:', err && err.message);
                });
            });
        }, Promise.resolve());
    }

    function notifyAllUsers(payload) {
        var database = db();
        if (!database) return Promise.resolve();
        return database.collection('users').get().then(function (snapshot) {
            var uids = [];
            snapshot.forEach(function (doc) { uids.push(doc.id); });
            return notifyUsers({ uids: uids, type: payload.type, title: payload.title, body: payload.body, eventId: payload.eventId });
        }).catch(function (err) {
            console.warn('[Notifications] notifyAllUsers failed:', err && err.message);
        });
    }

    function notifyAdmins(payload) {
        var database = db();
        if (!database) return Promise.resolve();
        return database.collection('users').where('role', '==', 'admin').get().then(function (snapshot) {
            var uids = [];
            snapshot.forEach(function (doc) { uids.push(doc.id); });
            if (!uids.length) return Promise.resolve();
            return notifyUsers({ uids: uids, type: payload.type, title: payload.title, body: payload.body, eventId: payload.eventId });
        }).catch(function (err) {
            console.warn('[Notifications] notifyAdmins failed:', err && err.message);
        });
    }

    // ------------------------------------------------------------------
    // Client-side event reminders ("a day before" + same-day).
    // Deterministic doc id per user+event+kind => no duplicates across
    // devices / refreshes. Runs whenever the member's events snapshot lands.
    // ------------------------------------------------------------------
    function reminderDocId(uid, eventId, kind) {
        return uid + '__' + kind + '__' + eventId;
    }

    function dateOnly(dateStr) {
        if (!dateStr) return null;
        var s = String(dateStr).slice(0, 10);
        var d = new Date(s + 'T00:00:00');
        return isNaN(d.getTime()) ? null : d;
    }

    function sameCalendarDay(a, b) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    function checkEventReminders(events) {
        var database = db();
        if (!database || !state.uid || !Array.isArray(events) || !events.length) {
            return Promise.resolve();
        }
        var now = new Date();
        var tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var jobs = [];

        events.forEach(function (ev) {
            if (!ev || !ev.id || !ev.date) return;
            var eventDay = dateOnly(ev.date);
            if (!eventDay) return;

            var kind = null;
            if (sameCalendarDay(eventDay, tomorrow)) kind = 'day1';
            else if (sameCalendarDay(eventDay, today)) kind = 'day0';
            if (!kind) return;

            var whenText = (kind === 'day1' ? 'Tomorrow' : 'Today') +
                (ev.time ? ' at ' + ev.time : '') +
                (ev.location ? ' · ' + ev.location : '');
            var payload = {
                type: 'reminder',
                title: (kind === 'day1' ? 'Upcoming tomorrow: ' : 'Happening today: ') + (ev.title || 'Event'),
                body: (ev.title || 'Event') + ' — ' + whenText + '. Please be on time!' + (ev.mapLink ? ' Map: ' + ev.mapLink : ''),
                eventId: ev.id
            };
            var docId = reminderDocId(state.uid, ev.id, kind);

            jobs.push(
                database.collection('notifications').doc(docId).get().then(function (snap) {
                    if (snap && snap.exists) return; // already delivered previously
                    return writeForUid(state.uid, payload, docId);
                }).catch(function (err) {
                    console.warn('[Notifications] reminder skipped:', err && err.message);
                })
            );
        });
        return Promise.all(jobs);
    }

    // ------------------------------------------------------------------
    // Bell + badge (injected into the header next to the profile button)
    // ------------------------------------------------------------------
    function mountBell() {
        if (state.bellEl) return;
        var header = document.querySelector('header');
        var profileLink = document.getElementById('profile-link');
        if (!header || !profileLink || !profileLink.parentNode) return;

        var bell = document.createElement('button');
        bell.id = 'notifications-bell';
        bell.type = 'button';
        bell.setAttribute('aria-label', 'Notifications');
        bell.setAttribute('title', 'Notifications');
        bell.className = 'touch-active relative flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-high text-on-surface-variant';
        bell.innerHTML =
            '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">notifications</span>' +
            '<span id="notifications-badge" class="hidden absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-white text-[11px] font-bold flex items-center justify-center leading-none">0</span>';
        bell.addEventListener('click', function () { openPanel(); });

        profileLink.parentNode.insertBefore(bell, profileLink);
        state.bellEl = bell;
        state.badgeEl = bell.querySelector('#notifications-badge');
        updateBadge();
    }

    function updateBadge() {
        if (!state.badgeEl) return;
        if (state.unreadCount > 0) {
            state.badgeEl.textContent = state.unreadCount > 99 ? '99+' : String(state.unreadCount);
            state.badgeEl.classList.remove('hidden');
        } else {
            state.badgeEl.classList.add('hidden');
        }
    }

    // ------------------------------------------------------------------
    // Toast popup for newly arriving notifications
    // ------------------------------------------------------------------
    function showToast(notif) {
        var meta = typeMeta(notif.type);
        var toast = document.createElement('div');
        toast.className = 'fixed top-20 left-0 right-0 mx-auto z-[95] bg-primary-container text-on-primary-container px-6 py-4 rounded-xl shadow-lg max-w-sm cursor-pointer';
        toast.innerHTML =
            '<div class="flex items-start gap-3">' +
                '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">' + esc(meta.icon) + '</span>' +
                '<div class="min-w-0">' +
                    '<p class="font-bold font-label-lg text-label-lg leading-snug">' + esc(notif.title) + '</p>' +
                    (notif.body ? '<p class="text-sm opacity-90 mt-0.5 break-words">' + esc(notif.body) + '</p>' : '') +
                '</div>' +
            '</div>';
        toast.addEventListener('click', function () { toast.remove(); openPanel(); });
        document.body.appendChild(toast);
        setTimeout(function () { toast.remove(); }, 5000);
    }

    // ------------------------------------------------------------------
    // Notification panel (slide-in card)
    // ------------------------------------------------------------------
    function ensurePanel() {
        if (state.panelEl) return;
        var panel = document.createElement('div');
        panel.id = 'notifications-panel-backdrop';
        panel.className = 'fixed inset-0 z-[90] bg-black/40 hidden';
        panel.innerHTML =
            '<div class="absolute top-0 right-0 h-full w-full max-w-md bg-surface-container-lowest shadow-2xl flex flex-col rounded-l-2xl overflow-hidden">' +
                '<div class="flex items-center justify-between gap-3 px-4 py-4 border-b-2 border-primary-container">' +
                    '<div class="flex items-center gap-2">' +
                        '<span class="material-symbols-outlined text-primary" style="font-variation-settings: \'FILL\' 1;">notifications</span>' +
                        '<h2 class="font-bold text-lg text-on-surface">Notifications</h2>' +
                        '<span id="notifications-panel-count" class="text-sm text-on-surface-variant"></span>' +
                    '</div>' +
                    '<div class="flex items-center gap-1">' +
                        '<button id="notifications-mark-all" type="button" class="touch-active h-11 px-3 rounded-xl bg-primary-container text-on-primary-container font-bold text-sm">Mark all read</button>' +
                        '<button id="notifications-close" type="button" aria-label="Close notifications" class="touch-active flex items-center justify-center w-11 h-11 rounded-full bg-surface-container-high text-on-surface-variant">' +
                            '<span class="material-symbols-outlined">close</span>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                '<div id="notifications-push-row" class="px-3 pt-3 hidden">' +
                    '<button id="notifications-enable-push" type="button" class="w-full h-12 rounded-xl bg-secondary-container text-on-secondary-container font-bold flex items-center justify-center gap-2">' +
                        '<span class="material-symbols-outlined">notifications_active</span>' +
                        '<span>Enable phone / laptop notifications</span>' +
                    '</button>' +
                    '<p class="text-xs text-on-surface-variant mt-1.5 px-1">Get alerts even when the app is closed (push).</p>' +
                '</div>' +
                '<div id="notifications-list" class="flex-1 overflow-y-auto p-3 space-y-2"></div>' +
            '</div>';
        document.body.appendChild(panel);
        state.panelEl = panel;

        panel.addEventListener('click', function (e) { if (e.target === panel) closePanel(); });
        panel.querySelector('#notifications-close').addEventListener('click', closePanel);
        panel.querySelector('#notifications-mark-all').addEventListener('click', markAllRead);
        var pushBtn = panel.querySelector('#notifications-enable-push');
        if (pushBtn) pushBtn.addEventListener('click', function () { enablePush(); });
    }
