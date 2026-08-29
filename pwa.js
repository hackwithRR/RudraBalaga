// pwa.js — makes Rudra Balaga installable as an APP:
// - Registers the service worker (offline shell + push)
// - Shows a one-tap "Install App" banner (Chrome/Edge/Android)
// - Chrome three-dot menu will also offer "Install Rudra Balaga"
//   and iOS Safari offers "Add to Home Screen" via the Share menu.
(function () {
    'use strict';

    var deferredPrompt = null;
    var dismissed = false;
    try { dismissed = localStorage.getItem('rb-install-dismissed') === '1'; } catch (e) { /* private mode */ }

    var isStandalone = false;
    try {
        isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true;
    } catch (e) { /* older browsers */ }

    // Register the service worker (http/https only — skipped on file://)
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.protocol === 'http:')) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('firebase-messaging-sw.js').catch(function (err) {
                console.warn('[PWA] service worker registration skipped:', err && err.message);
            });
        });
    }

    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault(); // take control of the native mini-infobar
        deferredPrompt = e;
        if (!isStandalone && !dismissed) showInstallBanner();
    });

    window.addEventListener('appinstalled', function () {
        hideInstallBanner();
        try { localStorage.setItem('rb-install-dismissed', '1'); } catch (e) {}
        deferredPrompt = null;
    });

    function showInstallBanner() {
        if (document.getElementById('rb-install-banner')) return;
        var banner = document.createElement('div');
        banner.id = 'rb-install-banner';
        banner.className = 'hidden fixed bottom-4 left-0 right-0 mx-auto z-[85] max-w-sm px-4';
        banner.innerHTML =
            '<div class="bg-primary-container text-on-primary-container rounded-2xl shadow-xl p-4 flex items-center gap-3">' +
                '<img src="icons/icon-192.png" class="w-11 h-11 rounded-xl object-cover" alt="Rudra Balaga">' +
                '<div class="flex-1 min-w-0">' +
                    '<p class="font-bold text-sm">Install Rudra Balaga</p>' +
                    '<p class="text-xs opacity-90 leading-snug">Add to your home screen — works like an app</p>' +
                '</div>' +
                '<button id="rb-install-btn" type="button" class="h-11 px-4 rounded-xl bg-white text-primary font-bold text-sm shrink-0">Install</button>' +
                '<button id="rb-install-close" type="button" aria-label="Dismiss" class="w-9 h-9 flex items-center justify-center rounded-full shrink-0">' +
                    '<span class="material-symbols-outlined text-xl">close</span>' +
                '</button>' +
            '</div>';
        document.body.appendChild(banner);

        banner.querySelector('#rb-install-btn').addEventListener('click', function () {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function (choice) {
                if (choice && choice.outcome === 'accepted') {
                    try { localStorage.setItem('rb-install-dismissed', '1'); } catch (e) {}
                }
                deferredPrompt = null;
                hideInstallBanner();
            }).catch(function () { hideInstallBanner(); });
        });
        banner.querySelector('#rb-install-close').addEventListener('click', function () {
            try { localStorage.setItem('rb-install-dismissed', '1'); } catch (e) {}
            dismissed = true;
            hideInstallBanner();
        });

        requestAnimationFrame(function () { banner.classList.remove('hidden'); });
    }

    function hideInstallBanner() {
        var banner = document.getElementById('rb-install-banner');
        if (banner) banner.remove();
    }

    // Manual API: window.RudraPWA.promptInstall() returns true if a native prompt is available
    window.RudraPWA = {
        canInstall: function () { return !!deferredPrompt; },
        promptInstall: function () {
            if (!deferredPrompt) return Promise.resolve(false);
            deferredPrompt.prompt();
            return deferredPrompt.userChoice.then(function (choice) {
                deferredPrompt = null;
                hideInstallBanner();
                return !!(choice && choice.outcome === 'accepted');
            });
        }
    };
})();
