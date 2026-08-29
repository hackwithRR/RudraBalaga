#!/usr/bin/env node
/**
 * send-pending-pushes.mjs — FREE background push fan-out for Rudra Balaga.
 *
 * Why: In-app notifications (bell/badge/toast) only fire while the app is OPEN,
 * because they rely on a Firestore listener. To reach members when the app is
 * CLOSED, the notification must be pushed via FCM from a server.
 *
 * This watcher does that with zero cost:
 *   1. Reads the `notifications` collection for docs where pushSent != true
 *      (these are created by admin actions: payment approved/rejected,
 *      announcements, event created/updated, bus info — and by the client-side
 *      reminders on every member page).
 *   2. Sends an FCM message to every fcmToken registered for that recipient.
 *   3. Marks the doc pushSent = true so it isn't sent again.
 *
 * Run it from the GitHub Action every few minutes (see .github/workflows/
 * push-fanout.yml) or manually:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node tools/send-pending-pushes.mjs
 */
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const SITE_URL = process.env.SITE_URL || 'https://rudra-b35ea.web.app/';
const ICON_URL = SITE_URL + 'icons/icon-192.png';

initializeApp({
    credential: process.env.FIREBASE_SERVICE_ACCOUNT
        ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
        : applicationDefault()
});
const db = getFirestore();

function buildMessage(notif, token) {
    const title = notif.title || 'Rudra Balaga';
    const body = notif.body || '';
    const type = notif.type || 'announcement';
    const eventId = notif.eventId || '';
    return {
        token,
        notification: { title, body },
        data: { type, eventId, title, body },
        webpush: {
            fcmOptions: { link: SITE_URL },
            notification: { icon: ICON_URL, badge: ICON_URL, tag: `rudra-${type}-${eventId || notif.id || Date.now()}` }
        }
    };
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

async function run() {
    const byUid = await loadTokensByUid();
    const pending = [];
    const snap = await db.collection('notifications').where('pushSent', '==', false).limit(500).get();
    snap.forEach((doc) => pending.push({ id: doc.id, ...doc.data() }));
    if (!pending.length) { console.log('No pending notifications to push.'); return; }
    console.log(`Found ${pending.length} pending notification(s) to push.`);

    let sent = 0, failed = 0, skipped = 0;
    const stale = [];
    for (const notif of pending) {
        const tokens = byUid.get(notif.uid) || [];
        if (!tokens.length) {
            skipped++;
            try { await db.collection('notifications').doc(notif.id).update({ pushSent: true }); } catch (e) {}
            continue;
        }
        for (const token of tokens) {
            try {
                await getMessaging().send(buildMessage(notif, token));
                sent++;
            } catch (err) {
                failed++;
                if (err && (err.code === 'messaging/registration-token-not-registered' || err.code === 'messaging/invalid-registration-token')) stale.push(token);
                console.warn(`  ! token failed (${err && err.code}):`, err && err.message);
            }
        }
        try { await db.collection('notifications').doc(notif.id).update({ pushSent: true, pushedAt: FieldValue.serverTimestamp() }); } catch (e) {}
    }
    for (const token of stale) { await db.collection('fcmTokens').doc(token).delete().catch(() => {}); }
    console.log(`Done — sent: ${sent}, failed: ${failed}, no-device-skipped: ${skipped}, stale tokens removed: ${stale.length}`);
}

run().then(() => process.exit(0)).catch((err) => { console.error('FATAL:', err && (err.message || err)); process.exit(1); });