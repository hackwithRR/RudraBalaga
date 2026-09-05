/* firebase-messaging-sw.js — the app's single service worker.
 * 1) PWA installability + offline shell (app-cache, network-first)
 * 2) Firebase Cloud Messaging background push handler
 * Registered by notifications.js (enablePush) and pwa.js (install support).
 */
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Same public config as firebase-config.js (config is not a secret)
firebase.initializeApp({
    apiKey: "AIzaSyBcj26zvZFr1EshD5YReTDydRD2eEcZyP4",
    authDomain: "rudra-b35ea.firebaseapp.com",
    projectId: "rudra-b35ea",
    storageBucket: "rudra-b35ea.firebasestorage.app",
    messagingSenderId: "1065975452357",
    appId: "1:1065975452357:web:267df33b6b0b08ac8f56ac"
});

// ---------------- Push (FCM) background handler ----------------
try {
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw] Background message received:', payload);
        const data = payload.data || {};
        const type = data.type || 'announcement';
        const title = data.title || 'Rudra Balaga';
        const body = data.body || '';
        // Always show the notification ourselves — senders use data-only
        // payloads so nothing is auto-displayed by the browser and all
        // tap/deep-link handling stays in our notificationclick handler.
        self.registration.showNotification(title, {
            body: body,
            icon: 'icons/icon-192.png',
            badge: 'icons/icon-192.png',
            tag: 'rudra-' + type + '-' + (data.eventId || Date.now()),
            data: { url: urlForType(type), type: type, eventId: data.eventId || '' },
            vibrate: [200, 100, 200],
            requireInteraction: false
        });
    });
} catch (e) {
    // Messaging requires a valid setup; PWA caching must keep working regardless
    console.warn('[firebase-messaging-sw] messaging init skipped:', e && e.message);
}

// Where should a notification tap land? (mirrors notifications.js)
function urlForType(type) {
    switch (type) {
        case 'event_new':
        case 'event_updated':
        case 'reminder':
            return 'events';
        case 'bus_info':
            return 'bus-routes';
        default:
            return 'index';
    }
}

// ---------------- PWA offline shell ----------------
const CACHE = 'rudra-balaga-v4';
const PRECACHE = [
    './',
    'index',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'shank.mp3'
];

self.addEventListener('install', (event) => {
    // Cache files individually so a single 404/missing asset can't fail the
    // whole install (addAll rejects if ANY request fails).
    event.waitUntil(
        caches.open(CACHE).then((cache) =>
            Promise.all(PRECACHE.map((url) =>
                cache.add(new Request(url, { cache: 'reload' })).catch((err) =>
                    console.warn('[SW] precache skipped:', url, err && err.message)
                )
            ))
        ).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Network-first for same-origin GETs (always fresh when online, cached when offline).
// Cross-origin (Firebase/CDN) traffic passes straight through untouched.
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
            return res;
        }).catch(() =>
            caches.match(req).then((hit) => hit || caches.match('./index'))
        )
    );
});

// Notification tap: open (or focus) the app and land on the right page.
self.addEventListener('notificationclick', (event) => {
    const notif = event.notification;
    notif.close();
    const targetUrl = (notif.data && notif.data.url) || 'index';
    const target = new URL(targetUrl, self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Prefer a window already showing the target page
            for (const client of clientList) {
                if (client.url === target && 'focus' in client) {
                    client.postMessage({ type: 'notification-tap', url: targetUrl, data: notif.data || {} });
                    return client.focus();
                }
            }
            // Otherwise focus any open app window and tell it to navigate
            for (const client of clientList) {
                if ('focus' in client) {
                    client.postMessage({ type: 'notification-tap', url: targetUrl, data: notif.data || {}, navigate: true });
                    return client.focus();
                }
            }
            // No window open — launch the app at the target page
            return self.clients.openWindow(target);
        })
    );
});

// Page asks the SW to navigate the focused window after a notification tap
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'navigate' && event.data.url) {
        event.waitUntil(
            self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                for (const client of clientList) {
                    if ('focus' in client) {
                        client.navigate(new URL(event.data.url, self.location.origin).href);
                        return client.focus();
                    }
                }
                return self.clients.openWindow(event.data.url);
            })
        );
    }
});
