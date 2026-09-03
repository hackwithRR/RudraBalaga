/* =====================================================================
 * language-switch.js — Kannada ⇄ English UI switcher (user pages only)
 * ---------------------------------------------------------------------
 * Adds a persistent Kannada/English toggle to the TopAppBar of every
 * user-facing page (Home, Events, Essentials, Bus/Rail, Profile).
 *
 * HOW IT WORKS
 *   • Preference is stored in localStorage under the key `lang`
 *     ('kn' default  |  'en'). It persists across page navigations.
 *   • Add `data-i18n="some.key"` to any element whose visible text you
 *     want switchable. Translated strings live in the I18N table at the
 *     bottom of this file — extend it as you add new UI text.
 *   • The current `<html lang>` attribute is kept in sync (accessibility).
 *
 * EXCLUDED FROM THIS SCRIPT:
 *   • admin.html / admin.js — the admin dashboard intentionally keeps
 *     the administrators' language fixed.
 * ===================================================================== */

(function () {
    'use strict';

    var STORAGE_KEY = 'lang';
    var DEFAULT_LANG = 'kn'; // Kannada is the primary language

    /* ---------- Language preference helpers ---------- */

    function getLang() {
        try {
            var v = localStorage.getItem(STORAGE_KEY);
            return v === 'en' ? 'en' : 'kn';
        } catch (e) {
            return DEFAULT_LANG;
        }
    }

    function setLang(lang) {
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) { /* storage unavailable — falls back for this tab */ }
    }

    /* ---------- Translation application ---------- */

    // Original Kannada text of every text node, so we can switch back to kn.
    var ORIG = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;

    // Translates one text node based on the language.
    function applyTextNode(node, lang) {
        if (!ORIG) return;
        if (!ORIG.has(node)) ORIG.set(node, node.nodeValue);
        var original = ORIG.get(node);

        if (lang === 'en') {
            var out = original;
            // 1) Exact & longest-key match first (most specific wins).
            out = translateExact(out);
            // 2) Fallback: replace any remaining Kannada token spans via AUTO.
            out = translateTokens(out);
            if (out !== original) node.nodeValue = out;
        } else {
            node.nodeValue = original; // restore exact Kannada source
        }
    }

    // Skip set: elements holding personal/user data or raw form values that
    // must never be "translated" (names, IDs, inputs, prefilled values).
    function isSkippedElement(el) {
        if (!el) return true;
        var id = el.id || '';
        if (id === 'user-name' || id === 'profile-user-id' || id === 'selected-event-title') return true;
        // Greeting hero: skipped ONLY once it has been personalized with the
        // user's name (data-pers="1", set by applyGreeting). The static
        // default text still gets translated for logged-out visitors.
        if (id === 'home-title' || id === 'home-greeting-label' || id === 'home-hero-icon-span') {
            return el.getAttribute('data-pers') === '1';
        }
        if (el.classList && el.classList.contains('no-translate')) return true;
        var tag = el.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'INPUT' || tag === 'TEXTAREA' ||
            tag === 'SELECT' || tag === 'OPTION' || tag === 'TITLE') return true;
        return false;
    }

    // Should a text node be auto-translated?
    function shouldTranslate(node) {
        var p = node.parentNode;
        if (!p) return false;
        if (p.closest && p.closest('[data-i18n]')) return false;
        if (isSkippedElement(p)) return false;
        return true;
    }

    // Replaces the whole trimmed text if it exactly matches an AUTO key.
    function translateExact(text) {
        var t = text.trim();
        if (Object.prototype.hasOwnProperty.call(AUTO, t)) {
            // Preserve surrounding whitespace from the source node.
            var lead = text.slice(0, text.indexOf(t));
            var trail = text.slice(text.indexOf(t) + t.length);
            return lead + AUTO[t] + trail;
        }
        return text;
    }

    // Replaces Kannada substrings (longest-first) anywhere in the text.
    function translateTokens(text) {
        if (!/[\u0C80-\u0CFF]/.test(text)) return text;
        var keys = Object.keys(AUTO).sort(function (a, b) { return b.length - a.length; });
        var out = text;
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (k.length < 2) continue; // avoid single-char over-matching
            if (out.indexOf(k) !== -1) {
                out = out.split(k).join(AUTO[k]);
            }
        }
        return out;
    }

    // Walks every text node, applying the current language translation.
    function walkAndTranslate(lang) {
        var root = document.body;
        if (!root || !document.createTreeWalker) return;

        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                return shouldTranslate(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });

        var n;
        while ((n = walker.nextNode())) {
            if (n.nodeValue && n.nodeValue.trim()) applyTextNode(n, lang);
        }
    }

    // Re-translates text nodes added dynamically (events, toasts, etc.)
    // while English mode is active. Skips user-data / [data-i18n] elements.
    var _observer = null;
    var _activeLang = 'kn';
    function ensureObserver() {
        if (_observer || typeof MutationObserver === 'undefined') return;
        _observer = new MutationObserver(function (mutations) {
            if (_activeLang !== 'en') return;
            for (var i = 0; i < mutations.length; i++) {
                var added = mutations[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var nd = added[j];
                    if (nd.nodeType !== 1) continue; // only element nodes
                    // translate any newly added text nodes (skip user data)
                    var walker = document.createTreeWalker(nd, NodeFilter.SHOW_TEXT, {
                        acceptNode: function (node) {
                            return shouldTranslate(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                        }
                    });
                    var n;
                    while ((n = walker.nextNode())) {
                        if (n.nodeValue && n.nodeValue.trim()) applyTextNode(n, 'en');
                    }
                }
            }
        });
        _observer.observe(document.body, { childList: true, subtree: true, characterData: false });
    }

    function applyTranslations(lang) {
        // Keep the active language for the MutationObserver.
        _activeLang = lang;
        // Observe dynamically-added nodes so later re-renders translate too.
        ensureObserver();

        // Keep <html lang> in sync (accessibility / text direction).
        var root = document.documentElement;
        if (root) root.setAttribute('lang', lang);

        // 1) Explicitly tagged elements (exact key -> full element swap).
        var nodes = document.querySelectorAll('[data-i18n]');
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            var key = el.getAttribute('data-i18n');
            var entry = I18N[key];
            if (entry && Object.prototype.hasOwnProperty.call(entry, lang)) {
                el.textContent = entry[lang];
            }
        }

        // 2) Auto-translate every other text node using the AUTO dictionary.
        walkAndTranslate(lang);
    }

    /* ---------- Toggle button ---------- */

    function buildToggle(lang) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'lang-toggle-btn';
        btn.setAttribute('aria-label', 'Switch language / ಭಾಷೆ ಬದಲಿಸಿ');
        btn.title = lang === 'kn' ? 'Switch to English' : 'ಕನ್ನಡಕ್ಕೆ ಬದಲಿಸಿ';

        var isEn = lang === 'en';
        btn.textContent = isEn ? 'ಕನ್ನಡ' : 'EN';
        btn.setAttribute('data-current', lang);

        btn.addEventListener('click', function () {
            var next = btn.getAttribute('data-current') === 'kn' ? 'en' : 'kn';
            setLang(next);
            btn.setAttribute('data-current', next);
            btn.textContent = next === 'kn' ? 'EN' : 'ಕನ್ನಡ';
            btn.title = next === 'kn' ? 'Switch to English' : 'ಕನ್ನಡಕ್ಕೆ ಬದಲಿಸಿ';
            applyTranslations(next); // re-translate the whole page instantly
            if (window.RBLang) window.RBLang._fireChange(next);
        });

        return btn;
    }

    // Inserts the toggle into the TopAppBar right-hand action group.
    function injectToggle(lang) {
        if (document.getElementById('lang-toggle-btn')) return;

        var header = document.querySelector('header');
        if (!header) return;

        var btn = buildToggle(lang);
        var groups = header.querySelectorAll('.flex.items-center.gap-2');
        if (groups.length) {
            // Preferred spot: right-hand icon group (insert nearest centre).
            groups[groups.length - 1].insertBefore(btn, groups[groups.length - 1].firstChild);
            return;
        }

        // Fallback (e.g. Profile header): append to the header's main row.
        var row = header.querySelector('.flex.justify-between');
        if (row) {
            row.appendChild(btn);
            btn.style.marginLeft = '0.5rem';
        }
    }

    /* ---------- Boot ---------- */

    function init() {
        var lang = getLang();
        setLang(lang);

        var style = document.createElement('style');
        style.textContent =
            '#lang-toggle-btn{' +
            '  flex:0 0 auto;cursor:pointer;border:1px solid rgba(139,94,60,.35);' +
            '  background:#fff8f1;color:#6d3a00;' +
            '  width:2.6rem;height:2.6rem;border-radius:999px;' +
            '  font-weight:800;font-size:.78rem;line-height:1;' +
            '  display:inline-flex;align-items:center;justify-content:center;' +
            '  box-shadow:0 2px 8px rgba(74,42,20,.12);' +
            '  -webkit-tap-highlight-color:transparent;transition:transform .1s ease;' +
            '}' +
            '#lang-toggle-btn:active{transform:scale(.92);}' +
            '#lang-toggle-btn:focus-visible{outline:3px solid rgba(196,90,22,.45);outline-offset:2px;}';
        document.head.appendChild(style);

        injectToggle(lang);
        applyTranslations(lang);
        // Let pages re-render locale-aware dynamic content (dates, greeting…)
        if (window.RBLang && window.RBLang._fireChange) window.RBLang._fireChange(lang);
    }

    // Helper so page scripts can re-translate after dynamic re-renders.
    // NOTE: defined at the END of the file (after AUTO/I18N) so the exposed
    //      references are populated. See bottom.
    window.RBLang = window.RBLang || { get: getLang, apply: applyTranslations };
    if (!window.RBLang.get) window.RBLang.get = getLang;
    if (!window.RBLang.apply) window.RBLang.apply = applyTranslations;
    var __rblang__ = {
        set: function (lang) {
            setLang(lang);
            applyTranslations(lang);
            var btn = document.getElementById('lang-toggle-btn');
            if (btn) {
                btn.setAttribute('data-current', lang);
                btn.textContent = lang === 'kn' ? 'EN' : 'ಕನ್ನಡ';
            }
            if (window.RBLang) window.RBLang._fireChange(lang);
        },
        translate: function (text, lang) {
            if (lang === 'kn') return text;
            var out = translateExact(String(text));
            return translateTokens(out);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
/* ---------------- AUTO DICTIONARY ---------------- */
    /* The walk-and-translate engine swaps any text node whose trimmed
     * Kannada string is a key below. Keys must EXACTLY match the source
     * text (incl. punctuation/spacing). The terms were extracted from
     * the actual pages. Add more as the app grows.                      */
    var AUTO = {
        'ರುದ್ರ': 'Rudra',
        // Dynamic template fragments (event cards etc.)
        'ರಂದು': 'on',
        'ಗಂಟೆಗೆ': 'at',
        'ಐಡಿ': 'ID',
        'ದಿನಾಂಕ ಲಭ್ಯವಿಲ್ಲ': 'Date not available',
        'ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮ': 'Upcoming event',
        'ದಿವ್ಯ ಮ್ಯಾಟ್ರಿಕ್ಸ್ ರಚನೆ': 'Divya Matrix Structure',
        'ಅಕ್ಷಗಳನ್ನು ಸ್ಥಿರಪಡಿಸುತ್ತಿದೆ': 'Stabilizing the syllables',
        'ತ್ರಿಶುಲ್ ಸ್ಥಾಪಿತ': 'Trishul established',
        'ಶುಭ ದಿನ': 'Good day',
        'ಸ್ವಾಗತ, ಭಕ್ತರೇ': 'Welcome, Devotees',

        'ಬಳಗ': 'Balaga',
        'ರುದ್ರ ಬಳಗ': 'Rudra Balaga',
        'ರುದ್ರ ಪರಾಯಣ': 'Rudra Parayana',
        'ಓಂ ನಮಃ ಶಿವಾಯ': 'Om Namah Shivaya',
        'ದೀವ್ಯತೆಗೆ ಹೋಮಿಗೆ': 'Towards the Divine',
        'ಪವಿತ್ರ ಸಮಜ್ಞಾನ // ಜನರೇಷನ್ ೫': 'Sacred Alignment // Generation V',
        'ಸ್ವಾಗತ': 'Welcome',
        'ಸಹಾಯ': 'Help',
        'ಅಗತ್ಯಗಳು': 'Essentials',
        'ಕಾರ್ಯಕ್ರಮ': 'Events',
        'ಬಸ್ / ರೈಲು': 'Bus / Rail',
        'ಪ್ರೊಫೈಲ್': 'Profile',
        'ಮುಖಪುಟ': 'Home',
        'ಅಡ್ಮಿನ್ ಪ್ಯಾನ್ಲ್': 'Admin Panel',
        'ಇಮೇಲ್': 'Email',
        'ಜನ್ಮ ತಾರೆ': 'Date of birth',
        'ಪೂರ್ಣ ಹೆಸರು': 'Full name',
        'ಫೋನ್ ನಂಬರ್': 'Phone number',
        'ವಿಳಾಸ': 'Address',
        'ಸಂಬಂಧ': 'Relation',
        'ಸದಸ್ಯರ ಐಡಿ': 'Member ID',
        'ಲಾಗ್ ಔಟ್': 'Log out',
        'ಪ್ರೊಫೈಲ್ ಸೇವ್ ಮಾಡಿ': 'Save Profile',
        'ಫೋಟೋ ಬದಲಿಸಿ': 'Change photo',
        'ನನ್ನ ಪ್ರೊಫೈಲ್': 'My Profile',
        'ತುರ್ತು ಸಂಪರ್ಕ ವಿವರಗಳು': 'Emergency contact details',
        'ತುರ್ತು ಸಂಪರ್ಕ ವ್ಯಕ್ತಿಯ ಹೆಸರು': 'Emergency contact name',
        'ತುರ್ತು ಸಂಪರ್ಕ ಫೋನ್ ನಂಬರ್': 'Emergency contact phone number',
        'ಶುಭ ದಿನ': 'Good day',
        'ಸ್ವಾಗತ, ಭಕ್ತರೇ': 'Welcome, Devotees',
        'ದೀವ್ಯ ಸಮಜ್ಞಾನ': 'Divine alignment',
        'ರುದ್ರ ಬಳಗ ಸಮುದಾಯದಲ್ಲಿ ನಿಮಗೆ ಹೃತ್ಪೂರ್ವಕ ಸ್ವಾಗತ': 'Hearty welcome to the Rudra Balaga community',
        'ನಿಮಗಾಗಿ ಇತ್ತೀಚಿನ ಮಾಹಿತಿ': 'Latest updates for you',
        'ಘೋಷಣೆಗಳು': 'Announcements',
        'ಘೋಷಣೆಗಳು ಲೋಡ್ ಆಗುತ್ತಿದ್ದಾರೆ...': 'Loading announcements…',
        'ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮ': 'Upcoming Event',
        'ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳಿಗಾಗಿ ಕೆಳಗೆ ಸ್ಕ್ರಾಲ್ ಮಾಡಿ': 'Scroll down for upcoming events',
        'ಎಲ್ಲಾ ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ನೋಡಿ': 'View all events',
        'ಬಸ್ / ರೈಲು ಪಿಕಪ್ ಪಾಯಿಂಟ್': 'Bus / Rail pickup point',
        'ನಿಮ್ಮ ಬಸ್ / ರೈಲು ಪಿಕಪ್ ಪಾಯಿಂಟ್ ಆಯ್ಕೆಮಾಡಿ': 'Select your Bus / Rail pickup point',
        'ದೇಣಿಗೆ — Donate': 'Donate',
        'ದೇಣಿಗೆ': 'Donation',
        'ನಿಮ್ಮ ಉದಾರ ದೇಣಿಗೆಯು ಸಮುದಾಯದ ಸೇವೆಗಳಿಗೆ ಸಹಾಯ ಮಾಡುತ್ತದೆ': 'Your generous donation supports community services',
        'ಪವಿತ್ರ ಗ್ರಂಥಗಳು': 'Sacred Scriptures',
        'Sacred Scriptures · ಓದಿ': 'Sacred Scriptures · Read',
        '© 2026 ರುದ್ರ ಬಳಗ · Rudra Parayana': '© 2026 Rudra Balaga · Rudra Parayana',
        'ರುದ್ರ ಪರಾಯಣ - ಸಭಿಕೆದರು ಡ್ಯಾಶ್‌ಬೋರ್ಡ್': 'Rudra Parayana - Member Dashboard',
        'ಕಾರ್ಯಕ್ರಮ ಇತಿಹಾಸ': 'Event History',
        'ಕಾರ್ಯಕ್ರಮ ಇತಿಹಾಸ - ರುದ್ರ ಪರಾಯಣ': 'Event History - Rudra Parayana',
        'ಕಾರ್ಯಕ್ರಮಗಳು ಲೋಡ್ ಆಗುತ್ತಿದೆ .': 'Loading events…',
        'ಇತಿಹಾಸದ ಕಾರ್ಯಕ್ರಮ ಇಲ್ಲ': 'No past events',
        'ನೀವು ಇನ್ನೂ ಯಾವುದೇ ಇವೆಂಟ್‌ನಲ್ಲಿ ಹಾಜರಾಗಿಲ್ಲ. ಇವೆಂಟ್‌ಗೆ ಹಾಜರಾದರೆ ನಿಮ್ಮ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ (ಚೆಕ್ಕೆಟ್) ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ.': 'You haven\'t attended any events yet. Once you attend, your checklist will appear here.',
        'ನನ್ನ ದೇಣಿಗೆಗಳು — My Donations': 'My Donations',
        // Donations modal (essentials)
        'ನನ್ನ ದೇಣಿಗೆಗಳು': 'My Donations',
        'ಒಟ್ಟು ದೇಣಿಗೆ': 'Total donated',
        'ಅನುಮೋದಿತ': 'Approved',
        'ನಿರೀಕ್ಷೆ': 'Pending',
        'ತಿರಸ್ಕರಿಸಲಾಗಿದೆ': 'Rejected',
        'ದೇಣಿಗೆ ನೀಡಿ': 'Donate now',
        'ದಿನಾಂಕ ಲಭ್ಯವಿಲ್ಲ': 'Date unavailable',
        'ಲಾಗಿನ್ ಅಗತ್ಯವಿದೆ.': 'Login required.',
        'ನೀವು ಇನ್ನೂ ಯಾವುದೇ ದೇಣಿಗೆಯನ್ನು ನೀಡಿಲ್ಲ.': 'You have not made any donations yet.',
        'ದೇಣಿಗೆಗಳನ್ನು ಲೋಡ್ ಆಗುತ್ತಿದ್ದಾರೆ...': 'Loading donations…',
        'ದೇಣಿಗೆಗಳನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.': 'Could not load donations.',
        'ಚೆಕ್ಕೆಟ್ ಪರಿಶೀಲನೆ': 'Checklist',
        'ರೀಸೆಟ್ ಮಾಡಿ': 'Reset',
        'ಸೂಚನೆಗಳು': 'Guidelines',
        '• ಪ್ರತಿಯೊಂದು ಕಾರ್ಯಕ್ರಮದಲ್ಲೂ ಸ್ವಚ್ಛತೆಯನ್ನು ಕಾಪಾಡಿ.': '• Maintain cleanliness at every event.',
        '• ಕಾರ್ಯಕ್ರಮದಲ್ಲಿ ನಿಶಬ್ದತೆಯನ್ನು ಕಾಪಾಡಿ': '• Maintain silence during the program',
        '• ಕಾರ್ಯಕ್ರಮದ ಸೂಚನೆಗಳನ್ನು ಪಾಲಿಸಿ': '• Follow the event instructions',
        '• ಮೊಬೈಲ್ ಫೋನ್ಸ್ ನಿಷ್ಕ್ರಿಯಗೊಳಿಸಿ': '• Switch off mobile phones',
        'ಹೊರಊರಿನ ಕಾರ್ಯಕ್ರಮಗಳು ಲೋಡ್ ಆಗುತ್ತಿದೆ .': 'Loading outstation events…',
        // Events-page dynamic fragments
        'ಹೊರಊರಿನ ಇವೆಂಟ್ ದಿನಾಂಕ': 'Outstation event dates',
        'ನಿರ್ಗಮನದಿಂದ ಬೆಂಗಳೂರು ಆಗಮನದವರೆಗೆ': 'Departure to Bangalore arrival',
        'ನಿಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆ': 'Your response',
        'ಹಾಜರಾಗುತ್ತಿಲ್ಲ': 'Not attending',
        'ಹಾಜರಾಗಿದ್ದೀರಿ': 'You attended',
        'ನನ್ನ ಉತ್ತರವನ್ನು ಬದಲಿಸಿ': 'Change my response',
        'ಭಾಗವಹಿಸುವವರು': 'Participants',
        'ಮಿತಿ': 'Limit',
        'ಬೆಂಗಳೂರು': 'Bengaluru',
        'ಹೊರಊರಿನ': 'Outstation',
        // Essentials checklist items (stored as data in Firestore)
        'ಪಂಚೆ': 'Panche (Dhoti)',
        'ನೀರು ಬೋಟಲ್': 'Water bottle',
        'ಬ್ಯಾಗ್': 'Bag',
        'ಕಾರ್ಡ್': 'Card',
        'ಅಗತ್ಯಗಳು - ರುದ್ರ ಪರಾಯಣ': 'Essentials - Rudra Parayana',
        'ಬಸ್ / ರೈಲು - ರುದ್ರ ಪರಾಯಣ': 'Bus / Rail - Rudra Parayana'
    };
    /* jshint +W100 */
/* ---------------- I18N DICTIONARY ---------------- */
    /* Extend freely: key = data-i18n value; value = { kn, en }.
     * 'kn' matches the text already in the markup; 'en' is shown in
     * English mode. Add new keys whenever you tag new UI text.       */

    var I18N = {
        // Brand / shared chrome
        'brand.title': { kn: 'ರುದ್ರ ಬಳಗ', en: 'Rudra Balaga' },
        'page.title.events': { kn: 'ಕಾರ್ಯಕ್ರಮ ಇತಿಹಾಸ', en: 'Event History' },
        'page.title.essentials': { kn: 'ಅಗತ್ಯಗಳು', en: 'Essentials' },
        'page.title.bus': { kn: 'ಬಸ್ / ರೈಲು', en: 'Bus / Rail' },
        'page.title.profile': { kn: 'ರುದ್ರ ಬಳಗ', en: 'Rudra Balaga' },
        'user.greeting': { kn: 'ಸ್ವಾಗತ', en: 'Welcome' },
        'help.label': { kn: 'ಸಹಾಯ', en: 'Help' },
        'nav.home': { kn: 'ಮುಖಪುಟ', en: 'Home' },
        'nav.events': { kn: 'ಕಾರ್ಯಕ್ರಮ', en: 'Events' },
        'nav.bus': { kn: 'ಬಸ್ / ರೈಲು', en: 'Bus / Rail' },
        'nav.essentials': { kn: 'ಅಗತ್ಯಗಳು', en: 'Essentials' },
        'nav.profile': { kn: 'ಪ್ರೊಫೈಲ್', en: 'Profile' },

        // Home (index.html)
        'home.greeting': { kn: 'ಶುಭ ದಿನ', en: 'Good day' },
        'home.title': { kn: 'ಸ್ವಾಗತ, ಭಕ್ತರೇ', en: 'Welcome, Devotees' },
        'home.subtitle': {
            kn: 'ರುದ್ರ ಬಳಗ ಸಮುದಾಯದಲ್ಲಿ ನಿಮಗೆ ಹೃತ್ಪೂರ್ವಕ ಸ್ವಾಗತ',
            en: 'Hearty welcome to the Rudra Balaga community'
        },
        'home.scrollHint': {
            kn: 'ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳಿಗಾಗಿ ಕೆಳಗೆ ಸ್ಕ್ರಾಲ್ ಮಾಡಿ',
            en: 'Scroll down for upcoming events'
        },
        'home.ann.title': { kn: 'ಘೋಷಣೆಗಳು', en: 'Announcements' },
        'home.ann.subtitle': {
            kn: 'ನಿಮಗಾಗಿ ಇತ್ತೀಚಿನ ಮಾಹಿತಿ',
            en: 'Latest updates for you'
        },
        'home.ann.loading': {
            kn: 'ಘೋಷಣೆಗಳು ಲೋಡ್ ಆಗುತ್ತಿದ್ದಾರೆ...',
            en: 'Loading announcements…'
        },
        'home.upcoming.title': { kn: 'ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮ', en: 'Upcoming Event' },

        // Profile (profile.html)
        'profile.heading': { kn: 'ನನ್ನ ಪ್ರೊಫೈಲ್', en: 'My Profile' },
        'profile.memberId': { kn: 'ಸದಸ್ಯರ ಐಡಿ', en: 'Member ID' },
        'profile.ftBannerTitle': { kn: 'ರುದ್ರ ಬಳಗಕ್ಕೆ ಸ್ವಾಗತ! 🙏', en: 'Welcome to Rudra Balaga! 🙏' },
        'profile.ftBannerText': { kn: 'ದಯವಿಟ್ಟು ಕೆಳಗೆ ನಿಮ್ಮ ಎಲ್ಲಾ ವಿವರಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ ಪ್ರೊಫೈಲ್ ಅನ್ನು ಉಳಿಸಿ.', en: 'Please fill in all your details below and save your profile.' },
        'profile.ftDone': { kn: 'ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಂಡಿದೆ! ಮುಖಪುಟಕ್ಕೆ ಕರ್ತಲಾಗುತ್ತಿದೆ…', en: 'Profile completed! Taking you to the home page…' },
        'profile.trackerLabel': { kn: 'ಪ್ರೊಫೈಲ್ ಪೂರ್ಣತೆ', en: 'Profile completion' },
        'profile.trackerHint': { kn: 'ಎಲ್ಲಾ ವಿವರಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ 100% ತಲುಪಿ.', en: 'Fill in all your details to reach 100%.' },
        'profile.verified': { kn: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ', en: 'Verified' },
        'profile.name': { kn: 'ಹೆಸರು', en: 'Name' },
        'profile.contact': { kn: 'ಸಂಪರ್ಕ ಮಾಹಿತಿ', en: 'Contact Details' }
    };
    /* jshint +W100 */

    // Populate the public helper with everything now that AUTO/I18N exist.
    // (set + translate were prepared earlier in __rblang__.)
    window.RBLang.set = __rblang__.set;
    window.RBLang.translate = __rblang__.translate;
    window.RBLang.AUTO = AUTO;
    window.RBLang.I18N = I18N;
    window.RBLang._applyActiveLang = function () { applyTranslations(getLang()); };

    // Current JS locale (for toLocaleDateString etc.) matching the language.
    window.RBLang.locale = function () { return getLang() === 'en' ? 'en-US' : 'kn-IN'; };
    // Returns 'kn' or 'en'.
    window.RBLang.language = getLang;

    // Re-render hooks: pages register callbacks run after a language switch
    // so dynamically-rendered content (event cards, dates, greeting) can be
    // re-built in the new language.
    // Don't clobber hooks a page may already have registered before this
    // script loaded (page scripts run first).
    window.RBLang._onChange = window.RBLang._onChange || [];
    window.RBLang.onChange = function (fn) {
        if (typeof fn === 'function') window.RBLang._onChange.push(fn);
    };
    window.RBLang._fireChange = function (lang) {
        var fns = window.RBLang._onChange || [];
        for (var i = 0; i < fns.length; i++) {
            try { fns[i](lang); } catch (e) { /* ignore per-hook errors */ }
        }
    };
})();