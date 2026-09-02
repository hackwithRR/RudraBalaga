/*
 * Full scripture texts, one file per scripture: scriptures/<id>.txt
 * Plain text (UTF-8, Kannada). Blank lines separate verses.
 * To add/fix a scripture: paste the full text into its .txt file — no code changes needed.
 * Requires the site to be served over HTTP (Firebase Hosting, `python3 -m http.server`, etc.).
 */
(function () {
    var SCRIPTURES = [
      { id: 'guru-vandhana', kn: 'ಗುರು ವಂದನಾ', en: 'Guru Vandhana', icon: 'self_improvement' },
      { id: 'ganesha-atharvashirsha', kn: 'ಗಣೇಶ ಆಥರ್ವಶೀರ್ಷ', en: 'Ganesha Atharvashirsha', icon: 'temple_hindu' },
      { id: 'mahanyasa', kn: 'ಮಹಾನ್ಯಾಸ', en: 'Mahanyasa', icon: 'auto_awesome' },
      { id: 'rudra-lagunyasa', kn: 'ರುದ್ರ ಲಘುನ್ಯಾಸ', en: 'Rudra Laghunyasa', icon: 'auto_fix_high' },
      { id: 'rudra-namakam', kn: 'ರುದ್ರ ನಮಕಮ್', en: 'Rudra Namaka', icon: 'menu_book' },
      { id: 'rudra-chamaka', kn: 'ರುದ್ರ ಚಮಕಮ್', en: 'Rudra Chamaka', icon: 'menu_book' },
      { id: 'purusha-suktha', kn: 'ಪುರುಷ ಸೂಕ್ತ', en: 'Purusha Suktha', icon: 'wb_sunny' },
      { id: 'durga-suktha', kn: 'ದುರ್ಗಾ ಸೂಕ್ತ', en: 'Durga Suktha', icon: 'flare' },
      { id: 'shree-suktha', kn: 'ಶ್ರೀ ಸೂಕ್ತ', en: 'Shree Sukta', icon: 'star' }
    ];

    var FONT_KEY = 'scripture-font-size';
    var readerOverlay = null;
    var listOverlay = null;

    var CSS = [
      '@supports (height:100dvh){.scripture-sheet{max-height:min(92dvh,52rem)!important;}}',
      '.scripture-overlay{position:fixed;inset:0;z-index:9998;display:flex;align-items:flex-end;justify-content:center;background:rgba(36,27,22,.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:0;animation:scriptureFade .2s ease;}',
      '.scripture-sheet{background:#fffcf8;border:1px solid #eadbd0;border-bottom:none;border-radius:1.5rem 1.5rem 0 0;box-shadow:0 -12px 60px rgba(36,27,22,.35);width:100%;max-width:34rem;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;animation:scriptureSheetUp .32s cubic-bezier(.2,.9,.3,1);}',
      '@keyframes scriptureFade{from{opacity:0}to{opacity:1}}',
      '@keyframes scriptureSheetUp{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:translateY(0)}}',
      /* Desktop: centered floating dialog */
      '@media(min-width:640px){',
      '.scripture-overlay{align-items:center;padding:1.25rem;}',
      '.scripture-sheet{border-bottom:1px solid #eadbd0;border-radius:1.5rem;animation:scripturePop .28s cubic-bezier(.2,.9,.3,1.15);box-shadow:0 24px 70px rgba(36,27,22,.32);}',
      '@keyframes scripturePop{from{opacity:0;transform:scale(.94) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}',
      '}',
      '.scripture-list-header{position:relative;display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:1.15rem 1.25rem 1rem;border-bottom:1px solid #f0e6dc;background:linear-gradient(135deg,#ffeddb,#fffcf8 70%);}',
      '.scripture-list-header::after{content:\'\';position:absolute;left:50%;bottom:.35rem;transform:translateX(-50%);width:2.75rem;height:4px;border-radius:999px;background:#eadbd0;}',
      '@media(min-width:640px){.scripture-list-header::after{display:none;}}',
      '.scripture-count-chip{font-size:.68rem;font-weight:800;letter-spacing:.06em;color:#9a4d00;background:#ffe3c2;border-radius:999px;padding:.2rem .6rem;white-space:nowrap;}',
      '.scripture-list-body{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:.8rem;display:flex;flex-direction:column;gap:.6rem;scrollbar-width:thin;scrollbar-color:#e3cdb9 transparent;}',
      '.scripture-list-body::-webkit-scrollbar{width:6px;}',
      '.scripture-list-body::-webkit-scrollbar-thumb{background:#e3cdb9;border-radius:999px;}',
      '.scripture-item{display:flex;align-items:center;gap:.75rem;min-height:4.25rem;padding:.65rem .8rem;border-radius:1.1rem;background:#fff;border:1.5px solid #eadbd0;text-align:left;cursor:pointer;transition:transform .15s ease,border-color .15s ease,box-shadow .2s ease;-webkit-tap-highlight-color:transparent;width:100%;box-sizing:border-box;}',
      '.scripture-item:active{transform:scale(.97);}',
      '@media(hover:hover){.scripture-item:hover{border-color:#ff9933;box-shadow:0 6px 20px rgba(255,153,51,.2);}}',
      '.scripture-item:focus-visible{outline:2px solid #ff9933;outline-offset:2px;}',
      '.scripture-item-num{display:flex;align-items:center;justify-content:center;width:1.35rem;height:1.35rem;border-radius:999px;background:linear-gradient(135deg,#ff9933,#c45a16);color:#fff;font-size:.62rem;font-weight:800;flex-shrink:0;align-self:center;}',
      '.scripture-item-icon{display:flex;align-items:center;justify-content:center;width:2.9rem;height:2.9rem;border-radius:.9rem;background:linear-gradient(135deg,#ffe3c2,#ffd6a6);color:#9a4d00;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.6);}',
      '.scripture-item-title{font-weight:700;color:#292524;font-size:1rem;line-height:1.25;}',
      '.scripture-item-sub{font-size:.72rem;color:#8c7a6b;letter-spacing:.03em;}',
      '.scripture-reader-header{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:.45rem;padding:.7rem .8rem calc(.7rem);border-bottom:1px solid #f0e6dc;background:rgba(255,252,248,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}',
      '.scripture-reader-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:1.15rem 1.25rem calc(2.25rem + env(safe-area-inset-bottom));background:#fffdf9;scrollbar-width:thin;scrollbar-color:#e3cdb9 transparent;}',
      '.scripture-reader-body::-webkit-scrollbar{width:6px;}',
      '.scripture-reader-body::-webkit-scrollbar-thumb{background:#e3cdb9;border-radius:999px;}',
      '.scripture-content{line-height:1.95;color:#292524;}',
      '.scripture-content p{margin-bottom:1rem;}',
      '.scripture-placeholder{text-align:center;color:#8c7a6b;font-style:italic;margin-top:2.5rem;}',
      '.scripture-back-btn,.scripture-font-btn,.scripture-close-btn{display:flex;align-items:center;justify-content:center;height:2.75rem;border-radius:999px;background:#fff3e6;color:#9a4d00;cursor:pointer;border:none;transition:transform .12s ease,background .15s ease;-webkit-tap-highlight-color:transparent;}',
      '.scripture-back-btn{padding:0 .9rem;gap:.35rem;font-size:.95rem;}',
      '.scripture-font-btn{width:2.75rem;}',
      '.scripture-close-btn{width:2.75rem;background:#ffe3c2;color:#7c3d00;}',
      '.scripture-back-btn:hover,.scripture-font-btn:hover{background:#ffe3c2;}',
      '.scripture-close-btn:hover{background:#ffd6a6;}',
      '.scripture-back-btn:active,.scripture-font-btn:active,.scripture-close-btn:active{transform:scale(.9);}',
      '.scripture-back{font-size:.72rem;color:#a08c7c;letter-spacing:.05em;}',
      '@media(prefers-reduced-motion:reduce){.scripture-overlay,.scripture-sheet,.sf-a{animation:none!important;transition:none!important;}}'
    ].join('');

    function injectStyles() {
        var el = document.getElementById('scripture-reader-styles');
        if (!el) {
            el = document.createElement('style');
            el.id = 'scripture-reader-styles';
            el.textContent = CSS;
            document.head.appendChild(el);
        }
    }

    function icon(name, filled) {
        return '<span class="material-symbols-outlined"' + (filled ? ' style="font-variation-settings:\'FILL\' 1;"' : '') + '>' + name + '</span>';
    }

    function closeReader() { if (readerOverlay) { readerOverlay.remove(); readerOverlay = null; } }
    function closeAll() { closeReader(); if (listOverlay) { listOverlay.remove(); listOverlay = null; } }
    function escHandler() { closeAll(); }

    var textCache = {};
    function loadScriptureText(s, el) {
        function show(text) { el.textContent = text; }
        function fail() {
            el.innerHTML = '<p class="scripture-placeholder">(ಪಠ್ಯ ಲಭ್ಯವಿಲ್ಲ — scriptures/' + s.id + '.txt ಸಿಗುತ್ತಿಲ್ಲ. ಸೈಟ್ ಅನ್ನು HTTP ಮೂಲಕ ಸರ್ವ್ ಮಾಡಿ ಮತ್ತು ಆ ಫೈಲ್‌ನಲ್ಲಿ ಪಠ್ಯ ಇದೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸಿ.)</p>';
        }
        if (textCache[s.id]) { show(textCache[s.id]); return; }
        fetch('scriptures/' + s.id + '.txt')
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
            .then(function (t) { textCache[s.id] = t.trim(); if (document.body.contains(el)) show(t.trim()); })
            .catch(fail);
    }



    function openScriptures() {
        injectStyles();
        if (listOverlay && document.body.contains(listOverlay)) return;
        listOverlay = document.createElement('div');
        listOverlay.className = 'scripture-overlay';
        var items = '';
        SCRIPTURES.forEach(function (s, i) {
            items +=
              '<button class="scripture-item" data-scripture-id="' + s.id + '" aria-label="' + s.en + '">' +
                '<span class="scripture-item-num">' + (i + 1) + '</span>' +
                '<span class="scripture-item-icon">' + icon(s.icon, true) + '</span>' +
                '<span style="min-width:0;">' +
                  '<span class="scripture-item-title kannada-text" style="display:block;">' + s.kn + '</span>' +
                  '<span class="scripture-item-sub">' + s.en + '</span>' +
                '</span>' +
              '</button>';
        });
        listOverlay.innerHTML =
          '<div class="scripture-sheet" role="dialog" aria-label="Sacred Scriptures">' +
            '<div class="scripture-list-header">' +
              '<div style="display:flex;align-items:center;gap:.6rem;min-width:0;">' +
                '<span class="scripture-item-icon" style="width:3rem;height:3rem;background:linear-gradient(135deg,#ffd6a6,#ff9933);color:#fff;">' + icon('auto_stories', true) + '</span>' +
                '<div style="min-width:0;">' +
                  '<h3 class="kannada-text font-bold text-stone-900" style="font-size:1.15rem;margin:0;">ಪವಿತ್ರ ಗ್ರಂಥಗಳು</h3>' +
                  '<p class="scripture-back" style="margin:0;">SACRED SCRIPTURES</p>' +
                '</div>' +
                '<span class="scripture-count-chip">' + SCRIPTURES.length + '</span>' +
              '</div>' +
              '<button class="scripture-close-btn" data-scripture-close aria-label="Close">' + icon('close') + '</button>' +
            '</div>' +
            '<div class="scripture-list-body">' + items + '</div>' +
          '</div>';
        document.body.appendChild(listOverlay);
        listOverlay.addEventListener('click', function (e) {
            if (e.target === listOverlay || e.target.closest('[data-scripture-close]')) { closeAll(); return; }
            var item = e.target.closest('[data-scripture-id]');
            if (item) openReader(item.getAttribute('data-scripture-id'));
        });
        document.addEventListener('keydown', escHandler);
    }

    function openReader(id) {
        injectStyles();
        var s = null;
        for (var i = 0; i < SCRIPTURES.length; i++) { if (SCRIPTURES[i].id === id) { s = SCRIPTURES[i]; break; } }
        if (!s) return;
        closeReader();
        var fontSize = parseInt(localStorage.getItem(FONT_KEY), 10);
        if (isNaN(fontSize)) fontSize = 18;
        fontSize = Math.min(Math.max(fontSize, 12), 34);
        readerOverlay = document.createElement('div');
        readerOverlay.className = 'scripture-overlay';
        readerOverlay.innerHTML =
          '<div class="scripture-sheet" role="dialog" aria-label="' + s.en + '">' +
            '<div class="scripture-reader-header">' +
              '<button class="scripture-back-btn" data-scripture-back aria-label="Back to scriptures list">' + icon('arrow_back') + '<span class="kannada-text font-bold">ಹಿಂದೆ</span></button>' +
              '<div style="flex:1;text-align:center;min-width:0;">' +
                '<h3 class="kannada-text font-bold text-stone-900" style="font-size:1.05rem;line-height:1.25;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + s.kn + '</h3>' +
                '<p class="scripture-back" style="margin:0;">' + s.en + '</p>' +
              '</div>' +
              '<button class="scripture-font-btn" data-scripture-font="dec" aria-label="Decrease font size">' + icon('remove') + '</button>' +
              '<button class="scripture-font-btn" data-scripture-font="inc" aria-label="Increase font size">' + icon('add') + '</button>' +
              '<button class="scripture-close-btn" data-scripture-close aria-label="Close">' + icon('close') + '</button>' +
            '</div>' +
            '<div class="scripture-reader-body"><div class="scripture-content kannada-text" style="font-size:' + fontSize + 'px;white-space:pre-wrap;" data-scripture-text><p class="scripture-placeholder">ಲೋಡ್ ಆಗುತ್ತಿದೆ…</p></div></div>' +
          '</div>';
        document.body.appendChild(readerOverlay);
        loadScriptureText(s, readerOverlay.querySelector('[data-scripture-text]'));

        readerOverlay.addEventListener('click', function (e) {
            if (e.target === readerOverlay || e.target.closest('[data-scripture-close]')) { closeAll(); return; }
            if (e.target.closest('[data-scripture-back]')) {
                closeReader();
                if (!listOverlay || !document.body.contains(listOverlay)) openScriptures();
                return;
            }
            var fontBtn = e.target.closest('[data-scripture-font]');
            if (fontBtn) {
                fontSize = fontBtn.getAttribute('data-scripture-font') === 'inc' ? Math.min(fontSize + 2, 34) : Math.max(fontSize - 2, 12);
                readerOverlay.querySelector('.scripture-content').style.fontSize = fontSize + 'px';
                localStorage.setItem(FONT_KEY, String(fontSize));
            }
        });
    }

    window.openScriptures = openScriptures;
})();

