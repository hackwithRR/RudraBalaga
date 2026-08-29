// Acceptance test: Bus Routes - Manage -> "Reuse Routes from Previous Event" dialog -> Copy Routes.
// Verifies: modal UX, dropdown contents, summary line, fresh IDs, and that bus number &
// driver phone are NOT copied (only bus names + pickup points/times).
// Simulates a logged-in admin like production with ALL Firebase traffic stubbed.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const CHROME = '/Users/jslap018/.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const CONFIG_PATH = '/Users/jslap018/Documents/RudraBalaga-main 2/firebase-config.js';

const STUBS = [
  'window.__writes = [];',
  "window.__fakeUser = { uid: 'test-admin-uid', email: 'admin@test.local', displayName: 'Test Admin' };",
  '(function () {',
  '  function makeDoc(colName, docId) {',
  '    return {',
  '      id: docId,',
  "      get: async () => colName === 'users'",
  "        ? { exists: true, data: () => ({ role: 'admin' }) }",
  '        : { exists: false, data: () => null },',
  '      set: (data) => { window.__writes.push({ collection: colName, doc: docId, data }); return Promise.resolve(); },',
  '      update: (data) => { window.__writes.push({ collection: colName, doc: docId, update: data }); return Promise.resolve(); },',
  '      delete: () => Promise.resolve()',
  '    };',
  '  }',
  '  window.firebaseAuth = {',
  "    onAuthStateChanged: function (cb) { setTimeout(() => { window.__authFired = true; cb(window.__fakeUser); }, 30); },",
  '    currentUser: window.__fakeUser,',
  '    signOut: () => Promise.resolve()',
  '  };',
  '  window.firebaseDb = {',
  '    collection: function (name) {',
  '      return {',
  '        doc: (id) => makeDoc(name, id),',
  '        where() { return this; }, orderBy() { return this; }, limit() { return this; },',
  "        get: async () => ({ forEach() {}, empty: true, size: 0 }),",
  '        onSnapshot(cb) { return function () {}; }',
  '      };',
  '    },',
  "    batch: () => ({ set() {}, update() {}, delete() {}, commit: () => Promise.resolve() })",
  '  };',
  '})();'
].join('\n');

let failures = 0;
function check(label, ok, extra) {
  console.log((ok ? '\u2713 ' : 'X ') + label + (extra !== undefined ? ' | ' + extra : ''));
  if (!ok) failures++;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push('PAGEERR: ' + err.message.split('\n')[0]));

  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.url().endsWith('/firebase-config.js')) {
      req.respond({ status: 200, contentType: 'application/javascript; charset=utf-8', body: fs.readFileSync(CONFIG_PATH, 'utf8') + '\n' + STUBS }).catch(() => {});
    } else { req.continue().catch(() => {}); }
  });

  await page.goto('http://localhost:5100/admin.html', { waitUntil: 'domcontentloaded', timeout: 20000 });

  try {
    await page.waitForFunction(() => window.__authFired === true, { timeout: 15000 });
  } catch {
    console.log('X auth stub never fired | url:', page.url());
    await browser.close(); process.exit(1);
  }
  await new Promise(r => setTimeout(r, 800));

  const stillAdmin = await page.evaluate(() => location.pathname.endsWith('/admin.html'));
  if (!stillAdmin) { console.log('X redirected - admin init failed'); await browser.close(); process.exit(1); }

  // ---- Seed: new empty outstation event + previous outstation event with buses + a Bangalore event ----
  const seeded = await page.evaluate(() => {
    state.events = [
      { id: 'evt-new', title: 'New Yatra', type: 'Outstation', date: '2026-09-20' },
      { id: 'evt-blr', title: 'Local Satsang', type: 'Bangalore', date: '2026-08-15' },
      { id: 'evt-old', title: 'Old Yatra', type: 'Outstation', date: '2026-07-10' }
    ];
    state.busRoutes = {
      'evt-old': [
        { id: 'bus-src-1', name: 'Bus Alpha', number: 'KA 01 AB 1234', driverNumber: '+91 90000 00001', routes: [
          { id: 'route-src-1', point: 'Banashankari', time: '06:30' },
          { id: 'route-src-2', point: 'MG Road', time: '07:00' }
        ]},
        { id: 'bus-src-2', name: 'Bus Beta', number: '', driverNumber: '', routes: [
          { id: 'route-src-3', point: 'Hebbal', time: '07:15' }
        ]}
      ],
      'evt-new': []
    };

    const sel = document.getElementById('bus-routes-users-event-select');
    sel.innerHTML = '';
    [['', 'Select an outstation event'], ['evt-new', 'New Yatra (Outstation)'], ['evt-old', 'Old Yatra (Outstation)']].forEach(([v, t]) => {
      const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o);
    });
    sel.value = 'evt-new';
    switchTab('bus-routes-users');
    displayBusRoutes();

    return {
      manageVisible: !document.getElementById('bus-management-section').classList.contains('hidden'),
      openerPresent: !!document.getElementById('open-copy-routes-modal-btn'),
      modalInitiallyHidden: document.getElementById('copy-routes-modal').classList.contains('hidden')
    };
  });

  check('manage panel visible after selecting event', seeded.manageVisible === true);
  check('compact opener button present (no long inline card)', seeded.openerPresent === true);

  // ---- 1) Open the dialog -> tappable cards list only the other outstation event with routes ----
  await page.evaluate(() => document.getElementById('open-copy-routes-modal-btn').click());
  await new Promise(r => setTimeout(r, 120)); // modal-open lands after a double requestAnimationFrame
  const opened = await page.evaluate(() => {
    const srcSel = document.getElementById('copy-routes-source-select');
    return {
      visible: !document.getElementById('copy-routes-modal').classList.contains('hidden'),
      animClass: document.getElementById('copy-routes-modal').classList.contains('modal-open'),
      bodyLocked: document.body.style.overflow === 'hidden',
      copyChips: Array.from(document.querySelectorAll('#copy-routes-modal .flex.flex-wrap > span')).map(s => s.textContent.trim()),
      sourceCards: Array.from(document.querySelectorAll('#copy-routes-source-list .copy-source-card')).map(c => ({
        id: c.dataset.eventId,
        text: c.textContent.replace(/\s+/g, ' ').trim(),
        selected: c.getAttribute('aria-selected')
      })),
      selectOptions: Array.from(srcSel.options).map(o => o.value),
      emptyMsgVisible: !document.getElementById('copy-routes-empty-msg').classList.contains('hidden'),
      summaryHidden: document.getElementById('copy-routes-summary').classList.contains('hidden'),
      resetToPlaceholder: srcSel.value === ''
    };
  });
  check('dialog opens with animation class + body scroll lock', opened.visible && opened.animClass && opened.bodyLocked, JSON.stringify({ visible: opened.visible, animClass: opened.animClass, bodyLocked: opened.bodyLocked }));
  check('copy-preview chips shown (copied vs not copied)', opened.copyChips.some(t => /Bus names/.test(t)) && opened.copyChips.some(t => /Pickup points & times/.test(t)) && opened.copyChips.some(t => /Bus number/.test(t)) && opened.copyChips.some(t => /Driver phone/.test(t)), JSON.stringify(opened.copyChips));
  check('source card lists ONLY the other outstation event with routes',
    opened.sourceCards.length === 1 && opened.sourceCards[0].id === 'evt-old' && opened.selectOptions.includes('evt-old'),
    JSON.stringify({ cards: opened.sourceCards, select: opened.selectOptions }));
  check('source card shows title, date & bus/pickup point counts',
    /Old Yatra/.test(opened.sourceCards[0]?.text || '') && /2 buses/.test(opened.sourceCards[0]?.text || '') && /3 pickup points/.test(opened.sourceCards[0]?.text || ''),
    opened.sourceCards[0]?.text);
  check('no card pre-selected, empty-state hidden, summary hidden',
    opened.sourceCards[0]?.selected === 'false' && opened.emptyMsgVisible === false && opened.resetToPlaceholder && opened.summaryHidden);

  // ---- 2) Escape closes the dialog and restores page scroll ----
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 350));
  const escClosed = await page.evaluate(() => ({
    hidden: document.getElementById('copy-routes-modal').classList.contains('hidden'),
    bodyRestored: document.body.style.overflow === ''
  }));
  check('Escape closes dialog + unlocks scroll', escClosed.hidden && escClosed.bodyRestored, JSON.stringify(escClosed));

  // ---- 3) Re-open, copy with NO source selected -> error toast, dialog stays open, no write ----
  await page.evaluate(() => document.getElementById('open-copy-routes-modal-btn').click());
  await new Promise(r => setTimeout(r, 100));
  await page.evaluate(() => document.getElementById('copy-routes-btn').click());
  await new Promise(r => setTimeout(r, 300));
  const noSource = await page.evaluate(() => ({
    writes: window.__writes.length,
    msg: document.getElementById('toast-message')?.textContent,
    stillOpen: !document.getElementById('copy-routes-modal').classList.contains('hidden')
  }));
  check('copy without source shows guidance toast, keeps dialog open, no write',
    noSource.writes === 0 && /Select a previous event/.test(noSource.msg || '') && noSource.stillOpen, noSource.msg);

  // ---- 4) Tap a source card -> selection highlighted + summary preview appears ----
  await page.evaluate(() => {
    document.querySelector('#copy-routes-source-list .copy-source-card[data-event-id="evt-old"]').click();
  });
  await new Promise(r => setTimeout(r, 100));
  const summary = await page.evaluate(() => ({
    selectValue: document.getElementById('copy-routes-source-select').value,
    cardSelected: document.querySelector('#copy-routes-source-list .copy-source-card[data-event-id="evt-old"]').getAttribute('aria-selected'),
    summaryVisible: !document.getElementById('copy-routes-summary').classList.contains('hidden'),
    summaryText: document.getElementById('copy-routes-summary-text')?.textContent || ''
  }));
  check('card tap selects the source event (syncs hidden select + highlight)',
    summary.selectValue === 'evt-old' && summary.cardSelected === 'true', JSON.stringify(summary));
  check('summary preview shows what will be copied',
    summary.summaryVisible && /Will copy 2 buses & 3 pickup points from "Old Yatra"/.test(summary.summaryText), summary.summaryText);

  // ---- 5) Copy -> buses/points copied, fresh IDs, number & driver NOT copied, dialog closes ----
  await page.evaluate(() => document.getElementById('copy-routes-btn').click());
  await new Promise(r => setTimeout(r, 400));
  const copied = await page.evaluate(() => {
    const write = window.__writes.find(w => w.collection === 'busRoutes' && w.doc === 'evt-new') || null;
    const buses = write ? write.data.buses : null;
    return {
      writeFound: !!write,
      buses,
      toast: document.getElementById('toast-message')?.textContent,
      renderedBusNames: Array.from(document.querySelectorAll('#buses-container h5')).map(h => h.textContent),
      selectedBusIsFirst: state.selectedBusId === (state.busRoutes['evt-new'][0] || {}).id,
      sourceUntouched: JSON.stringify(state.busRoutes['evt-old'].map(b => [b.id, b.number, b.driverNumber])) === JSON.stringify([['bus-src-1', 'KA 01 AB 1234', '+91 90000 00001'], ['bus-src-2', '', '']]),
      dialogClosed: document.getElementById('copy-routes-modal').classList.contains('hidden'),
      bodyUnlocked: document.body.style.overflow === ''
    };
  });

  const cb = copied.buses || [];
  const allIds = [...cb.map(b => b.id), ...cb.flatMap(b => (b.routes || []).map(r => r.id))];
  const srcIds = new Set(['bus-src-1', 'bus-src-2', 'route-src-1', 'route-src-2', 'route-src-3']);
  check('firestore write to busRoutes/evt-new recorded', copied.writeFound === true);
  check('2 buses copied', cb.length === 2, 'got ' + cb.length);
  check('route counts preserved (2 + 1)', (cb[0]?.routes || []).length === 2 && (cb[1]?.routes || []).length === 1);
  check('bus names copied in order', JSON.stringify(cb.map(b => b.name)) === JSON.stringify(['Bus Alpha', 'Bus Beta']), JSON.stringify(cb.map(b => b.name)));
  check('BUS NUMBER & DRIVER PHONE are NOT copied (empty on every copied bus)',
    cb.length === 2 && cb.every(b => b.number === '' && b.driverNumber === ''),
    JSON.stringify(cb.map(b => ({ n: b.number, d: b.driverNumber }))));
  check('pickup points & times preserved',
    JSON.stringify((cb[0]?.routes || []).map(r => [r.point, r.time])) === JSON.stringify([['Banashankari', '06:30'], ['MG Road', '07:00']]) &&
    JSON.stringify((cb[1]?.routes || []).map(r => [r.point, r.time])) === JSON.stringify([['Hebbal', '07:15']]));
  check('all copied bus/route IDs are FRESH (not reused from source)', allIds.length === 5 && allIds.every(id => !srcIds.has(id)), JSON.stringify(allIds));
  check('copied IDs are unique', new Set(allIds).size === allIds.length);
  check('success toast shown with no-copy note', /Copied 2 buses & 3 pickup points from Old Yatra/.test(copied.toast || '') && /start empty/.test(copied.toast || ''), copied.toast);
  check('manage list re-rendered with copied buses', JSON.stringify(copied.renderedBusNames) === JSON.stringify(['Bus Alpha', 'Bus Beta']), JSON.stringify(copied.renderedBusNames));
  check('first copied bus selected', copied.selectedBusIsFirst === true);
  check('source event data untouched (incl. its number/driver)', copied.sourceUntouched === true);
  check('dialog closes after successful copy + scroll unlocked', copied.dialogClosed === true && copied.bodyUnlocked === true);

  // ---- 6) Copying again asks to REPLACE: decline does nothing ----
  await page.evaluate(() => {
    document.getElementById('open-copy-routes-modal-btn').click();
    document.querySelector('#copy-routes-source-list .copy-source-card[data-event-id="evt-old"]').click();
    window.__confirmCalls = 0;
    window.confirm = () => { window.__confirmCalls++; return false; };
    document.getElementById('copy-routes-btn').click();
  });
  await new Promise(r => setTimeout(r, 300));
  const declined = await page.evaluate(() => ({ writes: window.__writes.length, confirms: window.__confirmCalls, buses: state.busRoutes['evt-new'].length }));
  check('declining replace-confirmation blocks the copy', declined.writes === 1 && declined.confirms === 1 && declined.buses === 2, JSON.stringify(declined));

  // ---- 7) Accepting replace-confirmation re-copies ----
  await page.evaluate(() => {
    window.confirm = () => { window.__confirmCalls++; return true; };
    document.getElementById('copy-routes-btn').click();
  });
  await new Promise(r => setTimeout(r, 300));
  const accepted = await page.evaluate(() => ({ writes: window.__writes.length, confirms: window.__confirmCalls, buses: state.busRoutes['evt-new'].length }));
  check('accepting replace-confirmation re-copies', accepted.writes === 2 && accepted.confirms === 2 && accepted.buses === 2, JSON.stringify(accepted));

  // ---- 8) Empty state: source event with no routes -> dashed empty card + no source cards ----
  const emptyState = await page.evaluate(() => {
    state.busRoutes['evt-old'] = [];
    openCopyRoutesModal();
    return {
      emptyMsgVisible: !document.getElementById('copy-routes-empty-msg').classList.contains('hidden'),
      cardCount: document.querySelectorAll('#copy-routes-source-list .copy-source-card').length,
      optionCount: document.getElementById('copy-routes-source-select').options.length
    };
  });
  check('empty-state shown when no other event has routes', emptyState.emptyMsgVisible === true && emptyState.cardCount === 0 && emptyState.optionCount === 1, JSON.stringify(emptyState));

  console.log('=== PAGE ERRORS ===');
  errors.length ? errors.forEach(e => console.log(' X', e)) : console.log(' \u2713 NONE');

  await browser.close();
  process.exit(failures === 0 && errors.length === 0 ? 0 : 1);
})();
