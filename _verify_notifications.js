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
  const wrapped = docs.map((d, i) => {
    const id = d.id || ('n' + (i + 1));
    return { id, ref: window.__makeDoc('notifications', id), data: d.data };
  });
  const wrappedChanges = (changes || []).map((c) => ({ type: c.type, doc: { id: c.doc.id, ref: window.__makeDoc('notifications', c.doc.id), data: c.doc.data } }));
  window.__notifSnapshotCbs.forEach((cb) => cb(window.__makeSnap(wrapped, wrappedChanges)));
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
  window.__makeDoc = makeDoc;
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

  await runChecks(page, errors);
  await browser.close();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
  process.exit(failures === 0 ? 0 : 1);
})().catch(err => { console.error('FATAL:', err); process.exit(1); });

async function runChecks(page, errors) {
  // 1. Bell injected into header
  check('bell button injected into header', await page.evaluate(() => !!document.getElementById('notifications-bell')));
  check('badge hidden initially (0 unread)', await page.evaluate(() => document.getElementById('notifications-badge').classList.contains('hidden')));

  // 2. Seed 2 unread notifications -> badge shows 2
  await page.evaluate(() => {
    window.__fireNotif(
      [
        { data: () => ({ uid: 'member-uid-1', type: 'event_new', title: 'New event: Satsang', body: 'Sat', read: false }) },
        { data: () => ({ uid: 'member-uid-1', type: 'payment_approved', title: 'Payment approved', body: '', read: false }) }
      ],
      []
    );
  });
  await new Promise(r => setTimeout(r, 300));
  check('badge shows 2 unread', await page.evaluate(() => document.getElementById('notifications-badge').textContent === '2'));

  // 3. Live toast for a NEW notification (docChanges added) — snapshot is cumulative (3 docs)
  await page.evaluate(() => {
    window.__fireNotif(
      [
        { data: () => ({ uid: 'member-uid-1', type: 'event_new', title: 'New event: Satsang', body: 'Sat', read: false }) },
        { data: () => ({ uid: 'member-uid-1', type: 'payment_approved', title: 'Payment approved', body: '', read: false }) },
        { data: () => ({ uid: 'member-uid-1', type: 'bus_info', title: 'Bus update: Yatra', body: 'Bus "Shiva" (No. KA 05 MH 2918) · Driver: +91 98765 43210', read: false }) }
      ],
      [{ type: 'added', doc: { id: 'n3', data: () => ({ uid: 'member-uid-1', type: 'bus_info', title: 'Bus update: Yatra', body: 'Bus "Shiva"', read: false }) } }]
    );
  });
  await new Promise(r => setTimeout(r, 300));
  const toastFound = await page.evaluate(() => [...document.querySelectorAll('body > div')].some(d => (d.className || '').includes('z-[95]') && d.textContent.includes('Bus update: Yatra')));
  check('live toast popup shown for new notification', toastFound);
  check('badge updated to 3', await page.evaluate(() => document.getElementById('notifications-badge').textContent === '3'));

  // 4. Panel opens and lists notifications
  await page.click('#notifications-bell');
  await new Promise(r => setTimeout(r, 300));
  check('panel visible after bell tap', await page.evaluate(() => !document.getElementById('notifications-panel-backdrop').classList.contains('hidden')));
  check('panel lists 3 notifications', await page.evaluate(() => document.querySelectorAll('#notifications-list [data-notif-idx]').length === 3));
  check('panel shows unread count (3)', await page.evaluate(() => document.getElementById('notifications-panel-count').textContent.includes('3')));

  // 5. Mark all read -> badge hidden + update writes to own docs
  const writesBefore = await page.evaluate(() => window.__writes.length);
  await page.click('#notifications-mark-all');
  await new Promise(r => setTimeout(r, 300));
  check('badge hidden after mark-all-read', await page.evaluate(() => document.getElementById('notifications-badge').classList.contains('hidden')));
  const readUpdates = await page.evaluate((before) => window.__writes.slice(before).filter(w => w.kind === 'update' && w.collection === 'notifications' && w.update && w.update.read === true).length, writesBefore);
  check('3 read-updates written to Firestore', readUpdates === 3, 'updates=' + readUpdates);

  // 6. Day-before reminder: deterministic doc + correct payload
  const reminder = await page.evaluate(async () => {
    const t = new Date(); t.setDate(t.getDate() + 1);
    const iso = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
    state.events = [{ id: 'ev-tmr', title: 'Test Yatra', date: iso, time: '06:00', location: 'Temple' }];
    await Notifications.checkEventReminders(state.events);
    return window.__writes.filter(w => w.kind === 'set' && w.collection === 'notifications');
  });
  const expectedId = 'member-uid-1__day1__ev-tmr';
  const rem = reminder.find(w => w.doc === expectedId);
  check('reminder written with deterministic doc id', !!rem, 'id=' + expectedId);
  check('reminder payload correct', !!rem && rem.data.type === 'reminder' && rem.data.title === 'Upcoming tomorrow: Test Yatra' && rem.data.body.includes('Tomorrow') && rem.data.body.includes('Temple') && rem.data.body.includes('at 06:00'));

  // 7. Dedupe: same reminder not re-sent when already delivered
  const dedupe = await page.evaluate(async () => {
    window.__existingNotifIds.add('member-uid-1__day1__ev-tmr');
    const before = window.__writes.length;
    await Notifications.checkEventReminders(state.events);
    return window.__writes.slice(before).filter(w => w.collection === 'notifications').length;
  });
  check('duplicate reminder skipped (dedupe works)', dedupe === 0, 'extra writes=' + dedupe);

  // 8. No page errors
  check('zero page errors', errors.length === 0, errors.join(' ; '));
}
