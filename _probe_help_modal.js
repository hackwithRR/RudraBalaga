// Probe: Admin help button shows FIXED support contacts (Rithvik / Subramanyam),
// not the Firestore "admins panel" listing, and the modal closes on backdrop tap.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const CHROME = '/Users/jslap018/.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const CONFIG_PATH = '/Users/jslap018/Documents/RudraBalaga-main 2/firebase-config.js';

const SHIM = [
  ';(function(){',
  "  var fakeAdmin={uid:'probe-admin-uid',email:'probe@test.local',displayName:'Probe Admin'};",
  '  var origOn=window.firebaseAuth.onAuthStateChanged.bind(window.firebaseAuth);',
  '  window.firebaseAuth.onAuthStateChanged=function(cb){return origOn.call(window.firebaseAuth,function(u){setTimeout(function(){cb(u||fakeAdmin);},30);});};',
  "  var snap={exists:true,id:'__probe',data:function(){return{role:'admin'};}};",
  '  var colFn=window.firebaseDb.collection.bind(window.firebaseDb);',
  '  window.firebaseDb.collection=function(name){var c=colFn(name);',
  "    if(name==='users'){var docFn=c.doc.bind(c);c.doc=function(uid){var d=docFn(uid);d.get=function(){return Promise.resolve(snap);};return d;};}",
  '    return c;};&'.replace('&',''),
  '})();'
].join('\n');

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const pageerrs = [];
  page.on('pageerror', e => pageerrs.push(e.message.split('\n')[0]));
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.url().endsWith('/firebase-config.js')) {
      req.respond({ status: 200, contentType: 'application/javascript; charset=utf-8', body: fs.readFileSync(CONFIG_PATH, 'utf8') + '\n' + SHIM }).catch(() => {});
    } else req.continue().catch(() => {});
  });

  await page.goto('http://localhost:5100/admin.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2500));

  // Click the floating "ಸಹಾಯ" (Help) button
  await page.evaluate(() => document.getElementById('help-btn').click());
  await new Promise(r => setTimeout(r, 400));

  const state = await page.evaluate(() => {
    const backdrop = Array.from(document.querySelectorAll('body > div'))
      .find(d => d.className.includes('bg-black bg-opacity-50'));
    return {
      modalOpen: !!backdrop,
      text: backdrop ? backdrop.innerText : '',
      hasOldAdminsPanelStrings: backdrop
        ? (/Loading admins|Contact an Admin|Unable to load admin/i.test(backdrop.innerHTML))
        : null,
      hasFetchCode: typeof showHelpModal === 'function'
    };
  });

  const names = ['Rithvik', '9148860082', 'Subramanyam', '9448588610'];
  const allPresent = names.every(n => state.text.includes(n));
  console.log(state.modalOpen ? '\u2713 HELP MODAL OPENS' : 'X HELP MODAL DID NOT OPEN');
  console.log(allPresent ? '\u2713 SHOWS RITHVIK (9148860082) & SUBRAMANYAM (9448588610)' : 'X CONTACTS MISSING:\n' + state.text);
  console.log(!state.hasOldAdminsPanelStrings ? '\u2713 NO ADMINS-PANEL FETCH STRINGS' : 'X OLD ADMIN-LIST CONTENT STILL PRESENT');
  console.log('Modal body:', JSON.stringify(state.text.replace(/\s+/g, ' ').trim()));

  // Close via close button, reopen, close via backdrop — verify dismissal paths
  await page.evaluate(() => document.getElementById('close-help-modal').click());
  await new Promise(r => setTimeout(r, 150));
  let closedViaBtn = await page.evaluate(() =>
    !Array.from(document.querySelectorAll('body > div')).some(d => d.className.includes('bg-black bg-opacity-50')));
  await page.evaluate(() => { document.getElementById('help-btn').click(); });
  await new Promise(r => setTimeout(r, 150));
  await page.evaluate(() => {
    const backdrop = Array.from(document.querySelectorAll('body > div')).find(d => d.className.includes('bg-black bg-opacity-50'));
    backdrop.click(); // simulate tapping the dark backdrop outside the card
  });
  await new Promise(r => setTimeout(r, 150));
  let closedViaBackdrop = await page.evaluate(() =>
    !Array.from(document.querySelectorAll('body > div')).some(d => d.className.includes('bg-black bg-opacity-50')));
  console.log(closedViaBtn ? '\u2713 CLOSES VIA X BUTTON' : 'X X-BUTTON CLOSE FAILED');
  console.log(closedViaBackdrop ? '\u2713 CLOSES VIA BACKDROP TAP' : '! backdrop tap does not close');

  console.log('PAGE ERRORS:', pageerrs.length ? pageerrs.join(' | ') : '(none)');
  await browser.close();
  const ok = state.modalOpen && allPresent && !state.hasOldAdminsPanelStrings && closedViaBtn;
  process.exit(ok ? 0 : 1);
})();