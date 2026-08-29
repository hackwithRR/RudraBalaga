// Visual check: screenshots of the Reuse Bus Routes dialog + manage tab (mobile & desktop).
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const CHROME = '/Users/jslap018/.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const CONFIG_PATH = '/Users/jslap018/Documents/RudraBalaga-main 2/firebase-config.js';
const OUT = '/tmp/rudra_ui';

const STUBS = [
  'window.__writes = [];',
  "window.__fakeUser = { uid: 'test-admin-uid', email: 'admin@test.local', displayName: 'Test Admin' };",
  '(function () {',
  '  function makeDoc(colName, docId) {',
  '    return { id: docId,',
  "      get: async () => colName === 'users' ? { exists: true, data: () => ({ role: 'admin' }) } : { exists: false, data: () => null },",
  '      set: (data) => Promise.resolve(), update: (data) => Promise.resolve(), delete: () => Promise.resolve() };',
  '  }',
  '  window.firebaseAuth = { onAuthStateChanged: function (cb) { setTimeout(() => { window.__authFired = true; cb(window.__fakeUser); }, 30); }, currentUser: window.__fakeUser, signOut: () => Promise.resolve() };',
  '  window.firebaseDb = { collection: function (name) { return { doc: (id) => makeDoc(name, id), where() { return this; }, orderBy() { return this; }, limit() { return this; }, get: async () => ({ forEach() {}, empty: true, size: 0 }), onSnapshot(cb) { return function () {}; } }; }, batch: () => ({ set() {}, update() {}, delete() {}, commit: () => Promise.resolve() }) };',
  '})();'
].join('\n');

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  fs.mkdirSync(OUT, { recursive: true });

  async function shoot(viewport, name) {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (req.url().endsWith('/firebase-config.js')) {
        req.respond({ status: 200, contentType: 'application/javascript; charset=utf-8', body: fs.readFileSync(CONFIG_PATH, 'utf8') + '\n' + STUBS }).catch(() => {});
      } else { req.continue().catch(() => {}); }
    });
    await page.goto('http://localhost:5100/admin.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(() => window.__authFired === true, { timeout: 15000 });
    await new Promise(r => setTimeout(r, 900));
    await page.evaluate(() => {
      state.events = [
        { id: 'evt-new', title: 'Shivagange Yatra', type: 'Outstation', date: '2026-09-20' },
        { id: 'evt-old', title: 'Gokarna Trip', type: 'Outstation', date: '2026-07-10' }
      ];
      state.busRoutes = {
        'evt-old': [
          { id: 'bus-src-1', name: 'Bus Alpha', number: 'KA 01 AB 1234', driverNumber: '+91 90000 00001', routes: [
            { id: 'route-src-1', point: 'Banashankari', time: '06:30' },
            { id: 'route-src-2', point: 'MG Road', time: '07:00' }
          ]},
          { id: 'bus-src-2', name: 'Bus Beta', number: '', driverNumber: '', routes: [{ id: 'route-src-3', point: 'Hebbal', time: '07:15' }]}
        ],
        'evt-new': []
      };
      const sel = document.getElementById('bus-routes-users-event-select');
      sel.innerHTML = '';
      [['', 'Select an outstation event'], ['evt-new', 'Shivagange Yatra (Outstation)'], ['evt-old', 'Gokarna Trip (Outstation)']].forEach(([v, t]) => {
        const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o);
      });
      sel.value = 'evt-new';
      switchTab('bus-routes-users');
      displayBusRoutes();
      window.scrollTo(0, 0);
    });
    await new Promise(r => setTimeout(r, 250));
    await page.screenshot({ path: `${OUT}/manage-${name}.png` });
    await page.evaluate(() => document.getElementById('open-copy-routes-modal-btn').click());
    await new Promise(r => setTimeout(r, 400));
    await page.evaluate(() => {
      const card = document.querySelector('#copy-routes-source-list .copy-source-card');
      if (card) card.click();
    });
    await new Promise(r => setTimeout(r, 250));
    await page.screenshot({ path: `${OUT}/dialog-${name}.png` });
    await page.close();
    console.log('done:', name);
  }

  await shoot({ width: 320, height: 568 }, 'w320');
  await shoot({ width: 360, height: 740 }, 'w360');
  await shoot({ width: 390, height: 844, deviceScaleFactor: 2 }, 'mobile');
  await shoot({ width: 1280, height: 900 }, 'desktop');
  await browser.close();
  console.log('Screenshots written to', OUT);
})();
