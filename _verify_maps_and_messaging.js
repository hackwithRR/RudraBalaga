#!/usr/bin/env node
/* Acceptance test: events page maps (Bangalore events) + notifications push-config surfacing.
 * Loads events.html with ALL Firebase traffic stubbed. Nothing touches production.
 * Verifies:
 *  - firebase-messaging-compat.js is loaded (window.firebase.messaging exists)
 *  - Bangalore events render embedded Google Maps iframes (2 seeded events -> 2 maps)
 *  - Outstation event renders NO map iframe
 *  - Bell panel shows the "push not configured" note while PUSH_VAPID_KEY is the placeholder
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const CHROME = '/Users/jslap018/.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const ROOT = '/Users/jslap018/Documents/RudraBalaga-main 2/';
const CONFIG_PATH = ROOT + 'firebase-config.js';
const URL_BASE = 'http://localhost:5137/events.html';

const STUBS = `
window.__writes = [];
window.__notifSnapshotCbs = [];
window.__makeSnap = function (docs, changes) {
  return { forEach: (cb) => docs.forEach(cb), docChanges: () => changes || [], size: docs.length, empty: docs.length === 0 };
};
window.__fakeUser = { uid: 'member-uid-1', email: 'member@test.local', displayName: 'Test Member' };
(function () {
  window.firebaseAuth = {
    onAuthStateChanged: function (cb) { setTimeout(() => { cb(window.__fakeUser); }, 30); },
    currentUser: window.__fakeUser,
    signOut: () => Promise.resolve()
  };
  function makeDoc(colName) {
    return {
      onSnapshot: function () { return function () {}; },
      get: async () => ({ exists: false, data: () => ({}) }),
      set: (data) => { window.__writes.push({ kind: 'set', collection: colName, data }); return Promise.resolve(); }
    };
  }
  window.firebaseDb = {
    collection: function (name) {
      return {
        doc: () => makeDoc(name),
        where() { return this; }, orderBy() { return this; }, limit() { return this; },
        get: async () => ({ forEach() {}, empty: true, size: 0 }),
        onSnapshot: function (cb, errCb) {
          setTimeout(function () {
            if (name === 'events') {
              cb(window.__makeSnap([
                { id: 'ev-blr',  data: () => ({ title: 'Rudra Abhisheka', type: 'Bangalore',  date: '2026-09-15', time: '06:00', location: 'ISKCON Bengaluru' }) },
                { id: 'ev-blr2', data: () => ({ title: 'Satsang', type: 'ಬೆಂಗಳೂರು', date: '2026-09-22', time: '06:00', location: 'Banashankari Temple, Bengaluru' }) },
                { id: 'ev-out',  data: () => ({ title: 'Tirupati Yatra', type: 'Outstation', date: '2026-10-01', time: '05:00', location: 'Tirupati' }) }
              ], []));
            } else {
              cb(window.__makeSnap([], []));
            }
          }, 40);
          return function () {};
        }
      };
    }
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
  await new Promise(r => setTimeout(r, 1500)); // let the events snapshot land + cards render

  // 1. firebase-messaging-compat.js now loads on member pages
  check('firebase.messaging() available (messaging-compat script loaded)',
    await page.evaluate(() => typeof firebase !== 'undefined' && typeof firebase.messaging === 'function'));

  // 2. Bangalore events render embedded Google Maps iframes; outstation does NOT
  const mapInfo = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#events-list > div')].filter(d => d.matches && d.matches('[data-event-id="ev-blr"], [data-event-id="ev-blr2"], [data-event-id="ev-out"]'));
    const googleIframes = [...document.querySelectorAll('#events-list iframe')].filter(f => (f.src || '').includes('google.com/maps'));
    const outCard = document.querySelector('[data-event-id="ev-out"]');
    return {
      cards: cards.length,
      googleIframes: googleIframes.length,
      outstationIframes: outCard ? outCard.querySelectorAll('iframe').length : -1
    };
  });
  check('events list rendered all 3 seeded event cards', mapInfo.cards === 3, 'cards=' + mapInfo.cards);
  check('2 Google Maps embeds rendered (one per Bangalore event)', mapInfo.googleIframes === 2, 'maps=' + mapInfo.googleIframes);
  check('outstation event card has no map', mapInfo.outstationIframes === 0, 'outstationIframes=' + mapInfo.outstationIframes);

  // 3. Map embeds point at an openable Google Maps URL for the venue query
  const firstMapSrc = await page.evaluate(() => {
    const f = document.querySelector('#events-list iframe');
    return f ? f.src : '';
  });
  check('map iframe uses Google Maps embed for the venue query',
    firstMapSrc.includes('google.com/maps?q=') && firstMapSrc.includes('ISKCON'), 'src=' + firstMapSrc);

  // 4. Bell panel hides the "push not configured" note now that the VAPID key is real
  await page.click('#notifications-bell');
  await new Promise(r => setTimeout(r, 400));
  check('push config note hidden once VAPID key is set',
    await page.evaluate(() => {
      const n = document.getElementById('notifications-push-config-note');
      return !n || n.classList.contains('hidden');
    }));
  check('pushIsConfigured() returns true with a real VAPID key',
    await page.evaluate(() => window.Notifications && window.Notifications._internal.pushIsConfigured() === true));

  // 5. Zero page errors
  check('zero page errors', errors.length === 0, errors.join(' ; '));

  await browser.close();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
  process.exit(failures === 0 ? 0 : 1);
})().catch(err => { console.error('FATAL:', err); process.exit(1); });