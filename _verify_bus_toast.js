// Acceptance test: Manage Bus Routes panel -> Save Bus Details -> success toast popup appears.
// Simulates a logged-in admin like production (initializeApp -> onAuthStateChanged(admin)
// -> setupEventListeners()) with ALL Firebase traffic stubbed. Nothing touches production.
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
  '        get: async () => ({ forEach() {}, empty: true, size: 0 }),',
  '        onSnapshot(cb) { return function () {}; }',
  '      };',
  '    },',
  '    batch: () => ({ set() {}, update() {}, delete() {}, commit: () => Promise.resolve() })',
  '  };',
  '})();'
].join('\n');

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  const navs = [];
  page.on('pageerror', err => errors.push('PAGEERR: ' + err.message.split('\n')[0]));
  page.on('framenavigated', f => { if (f === page.mainFrame()) navs.push(page.url()); });

  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.url().endsWith('/firebase-config.js')) {
      req.respond({ status: 200, contentType: 'application/javascript; charset=utf-8', body: fs.readFileSync(CONFIG_PATH, 'utf8') + '\n' + STUBS }).catch(() => {});
    } else { req.continue().catch(() => {}); }
  });

  await page.goto('http://localhost:5100/admin.html', { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Wait for real init flow: onAuthStateChanged -> admin branch -> listeners wired
  try {
    await page.waitForFunction(() => window.__authFired === true, { timeout: 15000 });
  } catch {
    console.log('X auth stub never fired | NAVS:', JSON.stringify(navs), '| url:', page.url());
    await browser.close(); process.exit(1);
  }
  await new Promise(r => setTimeout(r, 800));

  let okToContinue = true;
  let stillAdmin = false;
  try { stillAdmin = await page.evaluate(() => location.pathname.endsWith('/admin.html')); }
  catch (e) {
    console.log('X context died pre-seed:', e.message.split('\n')[0], '| NAVS:', JSON.stringify(navs), '| url:', page.url());
    okToContinue = false;
  }
  if (!okToContinue || !stillAdmin) { console.log('X redirected - admin init failed | NAVS:', JSON.stringify(navs)); await browser.close(); process.exit(1); }

  // Seed event+bus like real data would, open Manage tab, render buses
  let seeded = null;
  try {
    seeded = await page.evaluate(() => {
      state.busRoutes['evt-test'] = [{ id: 'bus-test', name: 'Bus Alpha', number: '', driverNumber: '', routes: [{ id: 'route-1', point: 'Banashankari', time: '08:00' }] }];
      const sel = document.getElementById('bus-routes-users-event-select');
      const opt = document.createElement('option');
      opt.value = 'evt-test'; opt.textContent = 'Test Outstation Event';
      sel.appendChild(opt); sel.value = 'evt-test';
      state.selectedBusId = 'bus-test';
      switchTab('bus-routes-users');
      displayBusRoutes();
      return {
        manageVisible: !document.getElementById('bus-management-section').classList.contains('hidden'),
        formPresent: !!document.querySelector('#buses-container form.bus-details-form')
      };
    });
  } catch (e) {
    console.log('X context died during seed:', e.message.split('\n')[0], '| NAVS:', JSON.stringify(navs));
    await browser.close(); process.exit(1);
  }
  if (!seeded.manageVisible || !seeded.formPresent) {
    console.log('FAIL: panel/form did not render:', JSON.stringify(seeded));
    await browser.close(); process.exit(1);
  }

  // Act like the admin: edit fields, press "Save Bus Details"
  await page.evaluate(() => {
    document.getElementById('bus-detail-number-bus-test').value = 'KA 05 MH 2918';
    document.getElementById('bus-detail-driver-bus-test').value = '+91 98765 43210';
    const form = document.querySelector('#buses-container form.bus-details-form');
    form.requestSubmit(form.querySelector('button[type="submit"]'));
  });
  await new Promise(r => setTimeout(r, 700));

  let result = null;
  try {
    result = await page.evaluate(() => {
      const toast = document.getElementById('toast');
      const r = toast.getBoundingClientRect();
      return {
        realmAlive: Array.isArray(window.__writes),
        message: document.getElementById('toast-message')?.textContent ?? null,
        icon: document.getElementById('toast-icon')?.textContent ?? null,
        visible: !toast.classList.contains('hidden') && !toast.classList.contains('opacity-0') && !toast.classList.contains('translate-x-6'),
        onScreen: r.top >= 0 && r.left >= 0 && r.width > 0 && r.height > 0,
        writes: window.__writes,
        reRenderedValue: document.querySelector('#buses-container input[id^="bus-detail-number"]')?.value ?? null
      };
    });
  } catch (e) {
    console.log('X NAVIGATION after save! realm destroyed | NAVS:', JSON.stringify(navs), '| url:', page.url());
    await browser.close(); process.exit(1);
  }

  const w = result.writes[0] || {};
  const writeOk = w.collection === 'busRoutes'
    && JSON.stringify((w.data?.buses || []).map(b => ({ id: b.id, number: b.number, driver: b.driverNumber })))
      === JSON.stringify([{ id: 'bus-test', number: 'KA 05 MH 2918', driver: '+91 98765 43210' }]);

  const passToast = result.realmAlive && result.visible && result.onScreen && /saved successfully/i.test(result.message || '');
  console.log(passToast ? '\u2713 TOAST POPUP SHOWN' : 'X TOAST NOT SHOWN',
    '| message:', JSON.stringify(result.message), '| icon:', result.icon, '| visible+onscreen:', result.visible && result.onScreen);
  console.log(writeOk ? '\u2713 FIRESTORE WRITE OK (mocked)' : 'X WRITE UNEXPECTED:', JSON.stringify(w).slice(0, 220));
  console.log(result.reRenderedValue === 'KA 05 MH 2918' ? '\u2713 FORM RE-RENDERED WITH SAVED VALUES' : '! re-render value: ' + result.reRenderedValue);

  await new Promise(r => setTimeout(r, 3200));
  let autoHide = false;
  try {
    autoHide = await page.evaluate(() => {
      const t = document.getElementById('toast');
      return t.classList.contains('opacity-0') || t.classList.contains('hidden');
    });
  } catch {}
  console.log(autoHide ? '\u2713 TOAST AUTO-DISMISSED AFTER ~3s' : '! toast persisted beyond ~4s');
  console.log('=== PAGE ERRORS ===');
  errors.length ? errors.forEach(e => console.log(' X', e)) : console.log(' \u2713 NONE');

  await browser.close();
  process.exit(passToast && writeOk ? 0 : 1);
})();
