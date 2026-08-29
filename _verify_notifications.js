// Acceptance test: Real-time notification center (Tier 1) + reminders.
// Simulates a logged-in member like production with ALL Firebase traffic stubbed.
// Verifies: bell injected, unread badge, live toast, notification panel,
// mark-all-read updates, day-before reminder write + dedupe.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const CHROME = '/Users/jslap018/.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const CONFIG_PATH = '/Users/jslap018/Documents/RudraBalaga-main 2/firebase-config.js';
const URL_BASE = 'http://localhost:5137/index.html';

const STUBS = `
window.__writes = [];
window.__existingNotifIds = new Set();
window.__fakeUser = { uid: 'member-uid-1', email: 'member@test.local', displayName: 'Test Member' };
window.__notifSnapshotCbs = [];
window.__makeSnap = function (docs, changes) {
  return { forEach: (cb) => docs.forEach(cb), docChanges: () => changes || [], size: docs.length, empty: docs.length === 0 };
};
window.__fireNotif = function (docs, changes) {
  const snap = window.__makeSnap(docs, changes);
  window.__notifSnapshotCbs.forEach((cb) => cb(snap));
};
(function () {
  function makeDoc(colName, docId) {
    return {
      id: docId,
      get: async () => ({ exists: !!(window.__existingNotifIds && window.__existingNotifIds.has(docId)), data: () => ({}) }),
      set: (data) => { window.__writes.push({ kind: 'set', collection: colName, doc: docId, data }); return Promise.resolve(); },
      update: (data) => { window.__writes.push({ kind: 'update', collection: colName, doc: docId, update: data }); return Promise.resolve(); },
      delete: () => Promise.resolve()
    };
  }
  window.firebaseAuth = {
    onAuthStateChanged: function (cb) { setTimeout(() => { window.__authFired = true; cb(window.__fakeUser); }, 30); },
    currentUser: window.__fakeUser,
    signOut: () => Promise.resolve()
  };
  window.firebaseDb = {
    collection: function (name) {
      return {
        doc: (id) => makeDoc(name, id),
        where() { return this; }, orderBy() { return this; }, limit() { return this; },
        get: async () => ({ forEach() {}, empty: true, size: 0 }),
        onSnapshot: function (cb, errCb) {
          if (name === 'notifications') {
            window.__notifSnapshotCbs.push(cb);
            setTimeout(() => cb(window.__makeSnap([], [])), 60);
          } else {
            setTimeout(() => cb(window.__makeSnap([], [])), 40);
          }
          return function () {};
        }
      };
    },
    batch: () => ({ set() {}, update() {}, delete() {}, commit: () => Promise.resolve() })
  };
})();
`;

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

  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });

  try {
    await page.waitForFunction(() => !!document.getElementById('notifications-bell'), { timeout: 15000 });
  } catch {
    console.log('X bell never appeared | url:', page.url(), '| errors:', errors.join(' ; '));
    await browser.close(); process.exit(1);
  }
  await new Promise(r => setTimeout(r, 500));

  await runChecks(page);
  await browser.close();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
  process.exit(failures === 0 ? 0 : 1);
})().catch(err => { console.error('FATAL:', err); process.exit(1); });

async function runChecks(page) {
