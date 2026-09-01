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
            pushSent: false, // false => the server watcher will push this to the member's devices
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
                    pushSent: false, // false => the server watcher will push this to the member's devices
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

            // Resolve the actual auth UID for a user document.
    // Some schemas store the Firebase Auth UID in a `uid` field; others use
    // the Firestore doc ID as the UID. This helper handles both safely.
    function userDocUid(doc, data) {
        if (!doc) return null;
        return (data && typeof data.uid === 'string' && data.uid) || doc.id;
    }

    function notifyAllUsers(payload) {
        var database = db();
        if (!database) return Promise.resolve();
        return database.collection('users').get().then(function (snapshot) {
            var uids = [];
            snapshot.forEach(function (doc) {
                var uid = userDocUid(doc, doc.data());
                if (uid) uids.push(uid);
            });
            // Log which UIDs have registered FCM tokens (for diagnostics)
            database.collection('fcmTokens').get().then(function (tokenSnap) {
                var tokenUids = {};
                tokenSnap.forEach(function (tdoc) { tokenUids[tdoc.data().uid] = true; });
                var reachable = uids.filter(function (u) { return tokenUids[u]; });
                console.log('[Notifications] notifyAllUsers: ' + uids.length + ' users total, ' +
                    reachable.length + ' with registered FCM tokens (' + tokenSnap.size + ' tokens)');
            }).catch(function (e) { console.warn('[Notifications] token count check failed:', e && e.message); });
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
            snapshot.forEach(function (doc) {
                var uid = userDocUid(doc, doc.data());
                if (uid) uids.push(uid);
            });
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
                ' · ' + formatEventDate(ev.date) +
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
    // ------------------------------------------------------------------
    // Custom notification sound — plays `notification.mp3` whenever an
    // OS-level notification fires while the app is open.
    // NOTE: browsers don't allow custom sounds on background (web push)
    // notifications — those use the system sound. This covers the common
    // "app open in background" case on Android/desktop. iOS may block audio
    // until the user has interacted with the page — fail-soft by design.
    // ------------------------------------------------------------------
    // Unlock audio on the user's first interaction. Mobile browsers (Android
    // Chrome, iOS Safari) block audio/AudioContext until a gesture happens on
    // the page — this ensures notification.mp3 can actually play later when a
    // notification arrives while the app is alive in the background.
    var notificationAudio = null;
    var audioCtx = null;
    var audioUnlocked = false;
    function unlockAudio() {
        if (audioUnlocked) return;
        audioUnlocked = true;
        try {
            if (!notificationAudio) {
                notificationAudio = new Audio('notification.mp3');
                notificationAudio.preload = 'auto';
            }
            // Silent "priming" play marks the element as gesture-activated
            var origVol = notificationAudio.volume;
            notificationAudio.muted = true;
            var p = notificationAudio.play();
            if (p && p.then) {
                p.then(function () {
                    notificationAudio.pause();
                    notificationAudio.currentTime = 0;
                    notificationAudio.muted = false;
                    notificationAudio.volume = origVol;
                }).catch(function () {
                    notificationAudio.muted = false;
                });
            }
        } catch (e) { /* fail-soft */ }
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (AC) {
                if (!audioCtx) audioCtx = new AC();
                if (audioCtx.state === 'suspended') audioCtx.resume().catch(function () {});
            }
        } catch (e) { /* fail-soft */ }
    }
    var appOpenSoundStarted = false;
    function maybePlayLoadingSound() {
        try {
            if (appOpenSoundStarted) return;
            appOpenSoundStarted = true;
            unlockAudio();
            setTimeout(function () {
                try { playNotificationSound(); } catch (e) {}
            }, 150);
        } catch (e) { /* fail-soft */ }
    }

    if (typeof document !== 'undefined') {
        ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(function (evt) {
            document.addEventListener(evt, function () {
                unlockAudio();
                if (!appOpenSoundStarted) maybePlayLoadingSound();
            }, { once: true, passive: true });
        });
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(maybePlayLoadingSound, 120);
        } else {
            document.addEventListener('DOMContentLoaded', function () {
                setTimeout(maybePlayLoadingSound, 120);
            }, { once: true });
        }
        window.addEventListener('pageshow', function () {
            setTimeout(maybePlayLoadingSound, 120);
        }, { once: true });
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) setTimeout(maybePlayLoadingSound, 120);
        }, { once: true });
    }

    function playNotificationSound() {
        try {
            if (!notificationAudio) {
                notificationAudio = new Audio('notification.mp3');
                notificationAudio.preload = 'auto';
                // If the mp3 can't load/play, fall back to the synthesized chime
                notificationAudio.addEventListener('error', function () {
                    try { notificationAudio = null; playChimeFallback(); } catch (e) {}
                });
            }
            try { notificationAudio.currentTime = 0; } catch (e) {}
            var p = notificationAudio.play();
            if (p && p.catch) p.catch(function () {
                // Autoplay blocked (e.g. iOS before first interaction) -> chime fallback
                try { playChimeFallback(); } catch (e) {}
            });
        } catch (e) { /* sound is a nice-to-have — never break notifications */ }
    }

    // Expose for the app-level actions (loading, RSVP selection, donation)
    window.unlockAudio = unlockAudio;
    window.playNotificationSound = playNotificationSound;
    window.maybePlayLoadingSound = maybePlayLoadingSound;

    // Fallback chime (Web Audio) used if notification.mp3 can't be played.
    function playChimeFallback() {
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            if (!audioCtx) audioCtx = new AC();
            if (audioCtx.state === 'suspended') audioCtx.resume().catch(function () {});
            var t0 = audioCtx.currentTime;
            // Pleasant two-tone chime: E6 -> G6
            [[1318.51, 0.00], [1567.98, 0.14]].forEach(function (tone) {
                var osc = audioCtx.createOscillator();
                var gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.value = tone[0];
                gain.gain.setValueAtTime(0, t0 + tone[1]);
                gain.gain.linearRampToValueAtTime(0.22, t0 + tone[1] + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, t0 + tone[1] + 0.55);
                osc.connect(gain).connect(audioCtx.destination);
                osc.start(t0 + tone[1]);
                osc.stop(t0 + tone[1] + 0.6);
            });
        } catch (e) { /* fail-soft */ }
    }

    // Where should a notification tap land?
    function urlForType(type) {
        switch (type) {
            case 'event_new':
            case 'event_updated':
            case 'reminder':
                return 'events.html';
            case 'bus_info':
                return 'bus-routes.html';
            default:
                return 'index.html';
        }
    }

    // Show a real OS-level notification (Android/iOS/desktop banner) while
    // the app is open — in addition to the in-app toast. This makes payment
    // updates, announcements and reminders appear as an Android notification
    // popup immediately, even before the FCM push sender runs.
    function fireOsNotification(notif) {
        try {
            if (typeof Notification === 'undefined') return;
            if (Notification.permission !== 'granted') return;
            if (typeof notif === 'string') notif = { title: notif };
            notif = notif || {};
            var tag = 'rudra-' + (notif.eventId || 'n') + '-' + (notif.type || 'msg') + '-' + Date.now();
            var osNotif = new Notification(notif.title || 'Rudra Balaga', {
                body: notif.body || '',
                icon: 'icons/icon-192.png',
                badge: 'icons/icon-192.png',
                tag: tag
            });
            // Tapping the OS banner opens/focuses the app and shows the panel
            osNotif.onclick = function () {
                try {
                    window.focus();
                    openPanel();
                } catch (e) { /* fail-soft */ }
            };
            // Do not play the custom sound for every app notification.
            // The app-specific success sounds are triggered only from the
            // explicit user action flows (loading, attending, donation).
        } catch (e) { /* failed silently — in-app toast still works */ }
    }
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
                    '<p id="notifications-push-config-note" class="hidden text-xs text-error mt-1.5 px-1">Push is not configured yet — an admin must add the Firebase "Web Push certificate" key (Firebase Console &gt; Project settings &gt; Cloud Messaging). In-app notifications still work.</p>' +
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

    function renderPanel() {
        if (!state.panelEl) return;
        var listEl = state.panelEl.querySelector('#notifications-list');
        var countEl = state.panelEl.querySelector('#notifications-panel-count');
        var pushRow = state.panelEl.querySelector('#notifications-push-row');
        if (countEl) {
            countEl.textContent = state.unreadCount > 0 ? '(' + state.unreadCount + ' unread)' : '';
        }
        if (pushRow) {
            var pushReady = (typeof Notification !== 'undefined' && Notification.permission === 'granted') || pushTokenSaved;
            pushRow.classList.toggle('hidden', pushReady);
            // Explain the missing Web Push certificate key to members (instead of a silent no-op).
            var configNote = pushRow.querySelector('#notifications-push-config-note');
            if (configNote) configNote.classList.toggle('hidden', pushIsConfigured());
        }
        if (!state.notifications.length) {
            listEl.innerHTML =
                '<div class="flex flex-col items-center justify-center text-center py-16 px-6 text-on-surface-variant">' +
                    '<span class="material-symbols-outlined text-5xl mb-3 opacity-60">notifications_off</span>' +
                    '<p class="font-label-lg text-label-lg">No notifications yet</p>' +
                    '<p class="text-sm mt-1">Event updates, payment status and bus info will appear here.</p>' +
                '</div>';
            return;
        }
        listEl.innerHTML = state.notifications.map(function (n, idx) {
            var meta = typeMeta(n.type);
            var unread = !n.read;
            return '<button type="button" data-notif-idx="' + idx + '" class="w-full text-left flex items-start gap-3 p-4 rounded-xl border ' +
                (unread ? 'bg-primary-fixed border-primary-container' : 'bg-white border-outline-variant opacity-80') +
                '">' +
                '<span class="material-symbols-outlined mt-0.5 ' + (unread ? 'text-primary' : 'text-on-surface-variant') + '" style="font-variation-settings: \'FILL\' 1;">' + esc(meta.icon) + '</span>' +
                '<span class="flex-1 min-w-0">' +
                    '<span class="flex items-center gap-2">' +
                        '<span class="font-bold font-label-lg text-label-lg text-on-surface leading-snug">' + esc(n.title) + '</span>' +
                        (unread ? '<span class="w-2 h-2 rounded-full bg-error shrink-0"></span>' : '') +
                    '</span>' +
                    (n.body ? '<span class="block text-sm text-on-surface-variant mt-0.5 break-words">' + esc(n.body) + '</span>' : '') +
                    '<span class="block text-xs text-on-surface-variant mt-1.5">' + esc(meta.label) + ' · ' + esc(relativeTime(n.createdAt, n.__receivedAt)) + '</span>' +
                '</span>' +
            '</button>';
        }).join('');

        Array.prototype.forEach.call(listEl.querySelectorAll('[data-notif-idx]'), function (btn) {
            btn.addEventListener('click', function () {
                var n = state.notifications[Number(btn.getAttribute('data-notif-idx'))];
                if (n) markRead(n);
            });
        });
    }

    function openPanel() {
        ensurePanel();
        state.panelOpen = true;
        renderPanel();
        state.panelEl.classList.remove('hidden');
    }

    function closePanel() {
        state.panelOpen = false;
        if (state.panelEl) state.panelEl.classList.add('hidden');
    }

    // ------------------------------------------------------------------
    // Push notifications (Tier 2) — free via Firebase Cloud Messaging.
    // 1) User taps "Enable phone / laptop notifications" in the panel
    // 2) We ask the browser for permission and get an FCM token
    // 3) Token is stored in Firestore `fcmTokens/{token}` for the sender
    //    (GitHub Action cron / Cloud Function) to deliver pushes.
    // Set PUSH_VAPID_KEY below (Firebase Console > Project settings >
    // Cloud Messaging > Web Push certificates) to activate.
    // ------------------------------------------------------------------
    var PUSH_VAPID_KEY = 'BHhS4k5C0L5urJkzMrL_xYDkK-FkOQNd9zj8iKTyuecx1VyCMAUtWeIU7GBkAKok-XrxO589uUxEHsUk5LuCKUk';
    var pushTokenSaved = false;

    // Web Push needs a real VAPID public key from Firebase Console >
    // Project settings > Cloud Messaging > "Web Push certificates".
    // Until an admin pastes that key here, push cannot register tokens, so we
    // surface it clearly (panel note + toast) instead of failing silently.
    function pushIsConfigured() {
        var key = String(PUSH_VAPID_KEY || '').trim();
        return !!key && key !== 'REPLACE_WITH_YOUR_WEB_PUSH_CERTIFICATE_PUBLIC_KEY';
    }

    function saveToken(uid, token) {
        var database = db();
        if (!database || !uid || !token) return Promise.resolve();
        pushTokenSaved = true;
        try {
            return database.collection('fcmTokens').doc(token).set({
                uid: uid,
                platform: navigator.userAgent || '',
                updatedAt: serverTimestamp()
            }).catch(function (err) {
                console.warn('[Notifications] token save failed:', err && err.message);
            });
        } catch (e) { return Promise.resolve(); }
    }

    // One FCM onMessage handler per page — shows foreground pushes as
    // in-app toast + OS notification popup (never duplicates).
    var pushListenerAttached = false;
    function attachMessagingListener(messaging) {
        if (pushListenerAttached || !messaging) return;
        pushListenerAttached = true;
        try {
            messaging.onMessage(function (payload) {
                var n = payload && payload.notification ? payload.notification : {};
                var data = payload && payload.data ? payload.data : {};
                var title = n.title || 'Rudra Balaga';
                var body = n.body || '';
                showToast({ type: data.type || 'announcement', title: title, body: body, eventId: data.eventId });
                fireOsNotification({ type: data.type || 'announcement', title: title, body: body, eventId: data.eventId });
            });
        } catch (e) { /* fail-soft */ }
    }

    // Register the device token automatically when the user already granted
    // permission — no need to tap the button again. This is the key step for
    // push to reach Android / desktop even when they never open the panel.
    function autoRegisterPush() {
        if (!state.uid || pushTokenSaved) return;
        if (typeof Notification === 'undefined') return;
        if (!pushIsConfigured()) return;
        if (!window.firebase || !firebase.messaging) return;
        // Auto-request permission on first load if not yet decided.
        if (Notification.permission !== 'granted') {
            Notification.requestPermission().then(function (permission) {
                if (permission === 'granted') {
                    registerPushToken();
                }
            }).catch(function (err) {
                console.warn('[Notifications] permission request failed:', err && err.message);
            });
            return;
        }
        registerPushToken();
    }

    // Register the FCM token (called by both autoRegisterPush and enablePush)
    function registerPushToken() {
        if (!state.uid) return;
        try {
            navigator.serviceWorker.register('firebase-messaging-sw.js').then(function (registration) {
                var messaging = firebase.messaging();
                attachMessagingListener(messaging);
                messaging.getToken({ vapidKey: PUSH_VAPID_KEY.trim(), serviceWorkerRegistration: registration })
                    .then(function (token) {
                        if (token) return saveToken(state.uid, token);
                    })
                    .catch(function (err) {
                        console.warn('[Notifications] auto push token failed:', err && err.message);
                    });
            }).catch(function (err) {
                console.warn('[Notifications] auto push SW register failed:', err && err.message);
            });
        } catch (e) {
            console.warn('[Notifications] auto push init failed:', e && e.message);
        }
    }

    function enablePush() {
        if (typeof Notification === 'undefined') return Promise.resolve('unsupported');
        var request = Notification.permission === 'granted'
            ? Promise.resolve('granted')
            : Notification.requestPermission();
        return Promise.resolve(request).then(function (permission) {
            if (permission !== 'granted') return permission;
            if (!pushIsConfigured()) {
                console.warn('[Notifications] Push is not configured: set PUSH_VAPID_KEY (Firebase Console > Project settings > Cloud Messaging > Web Push certificates) in notifications.js.');
                showToast({ type: 'announcement', title: 'Push not configured yet', body: 'An admin must add the Firebase Web Push certificate key. In-app notifications still work.' });
                return permission;
            }
            if (!window.firebase || !firebase.messaging) {
                console.warn('[Notifications] firebase-messaging-compat.js not loaded on this page.');
                return permission;
            }
            registerPushToken();
            return permission;
        });
    }

    // ------------------------------------------------------------------
    // Read state
    // ------------------------------------------------------------------
    function markRead(notif) {
        if (!notif) return;
        if (!notif.read && notif.ref) {
            try {
                notif.ref.update({ read: true }).catch(function (err) {
                    console.warn('[Notifications] markRead failed:', err && err.message);
                });
            } catch (e) { /* fail-soft */ }
        }
        if (!notif.read) {
            notif.read = true;
            state.unreadCount = Math.max(0, state.unreadCount - 1);
            updateBadge();
        }
        if (state.panelOpen) renderPanel();
    }

    function markAllRead() {
        state.notifications.filter(function (n) { return !n.read; }).forEach(markRead);
    }

    // ------------------------------------------------------------------
    // Real-time listener — member sees new notifications instantly
    // ------------------------------------------------------------------
    function attachListener() {
        var database = db();
        if (!database || state.unsubscribe) return;
        try {
            state.unsubscribe = database.collection('notifications')
                .where('uid', '==', state.uid)
                .onSnapshot(function (snapshot) {
                    var docs = [];
                    var nowMs = Date.now();
                    snapshot.forEach(function (d) {
                        var data = d.data();
                        data.id = d.id;
                        data.ref = d.ref;
                        data.__receivedAt = nowMs;
                        docs.push(data);
                    });
                    docs.sort(function (a, b) { return notifTimeMs(b) - notifTimeMs(a); });
                    state.notifications = docs;
                    state.unreadCount = docs.filter(function (n) { return !n.read; }).length;
                    updateBadge();
                    if (state.panelOpen) renderPanel();

                    if (state.firstSnapshotSeen) {
                        // Only toast genuinely-new docs (not the backlog on page load)
                        snapshot.docChanges().forEach(function (change) {
                            if (change.type === 'added') {
                                var newNotif = change.doc.data();
                                showToast(newNotif);
                                fireOsNotification(newNotif);
                            }
                        });
                    }
                    state.firstSnapshotSeen = true;
                }, function (err) {
                    console.warn('[Notifications] listener error (check security rules):', err && err.message);
                });
        } catch (e) {
            console.warn('[Notifications] could not attach listener:', e && e.message);
        }
    }

    // ------------------------------------------------------------------
    // Push notification tapped while a window was open: the SW asks us to
    // open the panel (same page) or navigate to the target page.
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', function (event) {
            var msg = event.data || {};
            if (msg.type !== 'notification-tap') return;
            try {
                var current = location.pathname.split('/').pop() || 'index.html';
                if (msg.navigate && msg.url && msg.url !== current) {
                    location.href = msg.url;
                    return;
                }
                openPanel();
            } catch (e) { /* fail-soft */ }
        });
    }

    // Public API
    // ------------------------------------------------------------------
    function init(opts) {
        opts = opts || {};
        if (!db() || !opts.uid) return; // demo mode / Firestore unavailable -> silent no-op
        state.uid = opts.uid;
        state.isAdmin = !!opts.isAdmin;
        state.firstSnapshotSeen = false;
        try { mountBell(); } catch (e) { /* header layout differences */ }
        attachListener();
        // If the browser permission was already granted, register the token
        // automatically so push works without tapping the panel button again.
        autoRegisterPush();
    }

    window.Notifications = {
        init: init,
        notifyUser: notifyUser,
        notifyUsers: notifyUsers,
        notifyAllUsers: notifyAllUsers,
        notifyAdmins: notifyAdmins,
        checkEventReminders: checkEventReminders,
        enablePush: enablePush,
        // exposed for tests
        _internal: {
            reminderDocId: reminderDocId,
            formatEventDate: formatEventDate,
            relativeTime: relativeTime,
            NOTIF_TYPES: NOTIF_TYPES,
            pushIsConfigured: pushIsConfigured,
            PUSH_VAPID_KEY: PUSH_VAPID_KEY,
            state: state
        }
    };
})();
