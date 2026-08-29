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
        const n = payload.notification || {};
        const data = payload.data || {};
        const type = data.type || 'announcement';
        const title = n.title || data.title || 'Rudra Balaga';
        const body = n.body || data.body || '';
        const icons = {
            event_new: 'icons/icon-192.png',
            event_updated: 'icons/icon-192.png',
            payment_submitted: 'icons/icon-192.png',
            payment_approved: 'icons/icon-192.png',
            payment_rejected: 'icons/icon-192.png',
            donation_submitted: 'icons/icon-192.png',
            donation_approved: 'icons/icon-192.png',
            donation_rejected: 'icons/icon-192.png',
            bus_info: 'icons/icon-192.png',
            announcement: 'icons/icon-192.png',
            reminder: 'icons/icon-192.png'
        };
        // Only call showNotification when the browser did NOT auto-display a
        // notification payload — avoids duplicates. Content (title/body) is taken
        // from either payload.notification or payload.data so it always shows.
        if (!n.title && !n.body) {
            self.registration.showNotification(title, {
                body: body,
                icon: icons[type] || 'icons/icon-192.png',
                badge: 'icons/icon-192.png',
                tag: 'rudra-' + type + '-' + (data.eventId || Date.now()),
                data: data,
                vibrate: [200, 100, 200]
            });
        }
    });
} catch (e) {
    // Messaging requires a valid setup; PWA caching must keep working regardless
    console.warn('[firebase-messaging-sw] messaging init skipped:', e && e.message);
}

// ---------------- PWA offline shell ----------------
const CACHE = 'rudra-balaga-v2';
const PRECACHE = [
    './',
    'index.html',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
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
            caches.match(req).then((hit) => hit || caches.match('./index.html'))
        )
    );
});

// Focus an existing window when a notification is tapped
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) return client.focus();
            }
            return self.clients.openWindow('index.html');
        })
    );
});
