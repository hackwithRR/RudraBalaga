// Smoke test: boot every page with stubbed Firebase; report any page errors / broken init.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const CHROME = '/Users/jslap018/.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const CONFIG_PATH = '/Users/jslap018/Documents/RudraBalaga-main 2/firebase-config.js';
const PAGES = ['index.html', 'admin.html', 'events.html', 'essentials.html', 'bus-routes.html', 'profile.html', 'login.html'];

const STUBS = `
window.__stubInjected = true;
window.__fakeUser = { uid: 'smoke-admin-uid', email: 'admin@test.local', displayName: 'Smoke Admin' };
(function () {
  function makeDoc(colName, docId) {
    return {
      id: docId,
      get: async () => colName === 'users'
        ? { exists: true, data: () => ({ role: 'admin', name: 'Smoke Admin' }) }
        : { exists: false, data: () => null },
      set: () => Promise.resolve(), update: () => Promise.resolve(), delete: () => Promise.resolve()
    };
  }
  window.__authHandlers = [];
  window.firebaseAuth = {
    onAuthStateChanged: function (cb) { window.__authHandlers.push(cb); setTimeout(() => cb(window.__fakeUser), 30); },
    currentUser: window.__fakeUser,
    signOut: () => Promise.resolve()
  };
  window.firebaseDb = {
    collection: function (name) {
      return {
        doc: (id) => makeDoc(name, id),
        where() { return this; }, orderBy() { return this; }, limit() { return this; },
        get: async () => ({ forEach() {}, empty: true, size: 0 }),
        onSnapshot: function (cb) { setTimeout(() => cb({ forEach() {}, docChanges: () => [], empty: true, size: 0 }), 40); return function () {}; }
      };
    },
    batch: () => ({ set() {}, update() {}, delete() {}, commit: () => Promise.resolve() })
  };
})();
`;

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  let bad = 0;
  for (const page_name of PAGES) {
    // Fresh context per page: the app's service worker persists across same-context
    // loads and would serve cached firebase-config.js instead of the test stub.
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const errors = [];
    const logs = [];
    page.on('pageerror', err => errors.push(err.message.split('\n')[0]));
    page.on('console', msg => { if (msg.type() === 'error' || msg.type() === 'warning') logs.push(msg.type() + ': ' + msg.text().slice(0, 100)); });
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (req.url().endsWith('/firebase-config.js')) {
        req.respond({ status: 200, contentType: 'application/javascript; charset=utf-8', body: fs.readFileSync(CONFIG_PATH, 'utf8') + '\n' + STUBS }).catch(() => {});
      } else { req.continue().catch(() => {}); }
    });
    await page.goto('http://localhost:5137/' + page_name, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 4000));
    const info = await page.evaluate(() => ({
      url: location.pathname.split('/').pop(),
      stubInjected: !!window.__stubInjected,
      authHandlerCount: (window.__authHandlers || []).length,
      hasNotif: !!window.Notifications,
      bell: !!document.getElementById('notifications-bell'),
      profileLink: !!document.getElementById('profile-link'),
      stateExists: typeof state !== 'undefined',
      stateUser: (typeof state !== 'undefined' && !!state.user),
      notifUid: !!(window.Notifications && Notifications._internal && Notifications._internal.state && Notifications._internal.state.uid)
    })).catch(e => ({ evalError: e.message.slice(0, 80) }));
    const bell = info && info.bell;
    const manifest = await page.evaluate(() => !!document.querySelector('link[rel="manifest"]')).catch(() => false);
    const ok = errors.length === 0;
    if (!ok) bad++;
    console.log((ok ? '\u2713 ' : 'X ') + page_name + ' | errors=' + errors.length + (errors.length ? ' -> ' + errors.slice(0, 3).join(' ; ') : '') + ' | info=' + JSON.stringify(info) + ' | manifest=' + manifest);
    await page.close();
  }
  await browser.close();
  console.log(bad === 0 ? 'SMOKE OK: all pages clean' : bad + ' page(s) with errors');
  process.exit(bad === 0 ? 0 : 1);
})().catch(err => { console.error('FATAL:', err); process.exit(1); });
