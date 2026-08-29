#!/usr/bin/env node
/**
 * send-notifications.mjs — FREE push sender for Rudra Balaga (Firebase Cloud Messaging).
 *
 * Why: Cloud Functions requires a Blaze billing account. This does the same job
 * with zero cost — run manually, or via .github/workflows/daily-reminders.yml.
 *
 * Setup (one time):
 *   1. Firebase Console > Project settings > Service accounts
 *      > "Generate new private key" -> save as service-account.json (NEVER commit it!)
 *   2. npm install firebase-admin
 *   3. export GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
 *      (or export FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)")
 *
 * Day-before reminders (same logic as the in-app reminder, delivered as PUSH):
 *   node send-notifications.mjs reminders
 *   node send-notifications.mjs reminders --also-today
 *
 * Manual broadcast to everyone:
 *   node send-notifications.mjs broadcast --title "Satsang at 6 AM" --body "Arrive by 5:45"
 *
 * Each reminder is sent ONCE — guarded by a Firestore doc in `pushMeta`.
 */

import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const SITE_URL = process.env.SITE_URL || 'https://rudra-b35ea.web.app/';
const ICON_URL = SITE_URL + 'icons/icon-192.png';

// ---- init admin SDK (env var / GitHub secret, never a committed file) ----
initializeApp({
    credential: process.env.FIREBASE_SERVICE_ACCOUNT
        ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
        : applicationDefault()
});
const db = getFirestore();

// ---- helpers ----
function dateOnly(str) {
    if (!str) return null;
    const d = new Date(String(str).slice(0, 10) + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
}
function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatEventDate(dateStr) {
    const d = dateOnly(dateStr);
    return d ? d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : String(dateStr || '');
}

async function loadTokensByUid() {
    const snap = await db.collection('fcmTokens').get();
    const byUid = new Map();
    snap.forEach((doc) => {
        const uid = doc.data().uid;
        if (!uid) return;
        if (!byUid.has(uid)) byUid.set(uid, []);
        byUid.get(uid).push(doc.id);
    });
    return byUid;
}

async function sendToUids(uids, { title, body, type, eventId }) {
    const byUid = await loadTokensByUid();
    let sent = 0, failed = 0;
    const stale = [];
    for (const uid of uids) {
        const tokens = byUid.get(uid) || [];
        for (const token of tokens) {
            try {
                await getMessaging().send({
                    token,
                    notification: { title, body },
                    data: { type: type || 'announcement', eventId: eventId || '' },
                    webpush: {
                        fcmOptions: { link: SITE_URL },
                        notification: { icon: ICON_URL, badge: ICON_URL, tag: `rudra-${type || 'msg'}-${eventId || Date.now()}` }
                    }
                });
                sent++;
            } catch (err) {
                failed++;
                // Dead tokens are removed so retries stay clean
                if (err && (err.code === 'messaging/registration-token-not-registered' || err.code === 'messaging/invalid-registration-token')) {
                    stale.push(token);
                }
                console.warn(`  ! token failed (${err && err.code}):`, err && err.message);
            }
        }
    }
    for (const token of stale) {
        await db.collection('fcmTokens').doc(token).delete().catch(() => {});
    }
    console.log(`Sent: ${sent}, failed: ${failed}, stale tokens removed: ${stale.length}`);
}

async function writeInAppNotifications(uids, payload) {
    if (!uids.length) return;
    for (let i = 0; i < uids.length; i += 450) {
        const batch = db.batch();
        uids.slice(i, i + 450).forEach((uid) => {
            batch.set(db.collection('notifications').doc(), {
                uid, type: payload.type, title: payload.title, body: payload.body,
                eventId: payload.eventId || null, read: false,
                createdAt: new Date()
            });
        });
        await batch.commit();
    }
}

// ---- commands ----
async function getAllUids() {
    const uids = [];
    const usersSnap = await db.collection('users').get();
    usersSnap.forEach((doc) => uids.push(doc.id));
    return uids;
}

async function cmdReminders(alsoToday) {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const events = [];
    const evSnap = await db.collection('events').get();
    evSnap.forEach((doc) => events.push({ id: doc.id, ...doc.data() }));

    for (const ev of events) {
        const day = dateOnly(ev.date);
        if (!day) continue;
        let kind = null;
        if (sameDay(day, tomorrow)) kind = 'day1';
        else if (alsoToday && sameDay(day, today)) kind = 'day0';
        if (!kind) continue;

        // Send each reminder exactly once (guarded doc in `pushMeta`)
        const metaId = `reminder_${kind}_${ev.id}`;
        const metaRef = db.collection('pushMeta').doc(metaId);
        const meta = await metaRef.get();
        if (meta.exists) { console.log(`- skip (already sent): ${ev.title} [${kind}]`); continue; }

        const whenText = (kind === 'day1' ? 'Tomorrow' : 'Today') + (ev.time ? ' at ' + ev.time : '') + (ev.location ? ' · ' + ev.location : '');
        const payload = {
            type: 'reminder',
            eventId: ev.id,
            title: (kind === 'day1' ? 'Upcoming tomorrow: ' : 'Happening today: ') + (ev.title || 'Event'),
            body: `${ev.title || 'Event'} — ${whenText}. Please be on time! (${formatEventDate(ev.date)})`
        };

        const uids = await getAllUids();
        console.log(`> ${ev.title} [${kind}] -> ${uids.length} members`);
        await sendToUids(uids, payload);
        await writeInAppNotifications(uids, payload);
        await metaRef.set({ sentAt: new Date(), eventId: ev.id, kind, title: payload.title });
    }
}

async function cmdBroadcast(title, body) {
    const uids = await getAllUids();
    console.log(`> broadcast -> ${uids.length} members`);
    await sendToUids(uids, { title, body, type: 'announcement', eventId: null });
    await writeInAppNotifications(uids, { title, body, type: 'announcement', eventId: null });
}

// ---- CLI ----
const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'reminders') {
    cmdReminders(args.includes('--also-today')).then(() => process.exit(0));
} else if (cmd === 'broadcast') {
    const pick = (name) => (args.find(a => a.startsWith(name + '=')) || '').split('=').slice(1).join('=');
    cmdBroadcast(pick('--title') || 'Rudra Balaga', pick('--body') || '').then(() => process.exit(0));
} else {
    console.log('Usage: node send-notifications.mjs reminders [--also-today] | broadcast --title="..." --body="..."');
    process.exit(1);
}
