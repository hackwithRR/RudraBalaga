// Probe: REAL Firebase SDK+network against localhost:5100 (reads only - ALL firestore WRITE
// requests blocked at HTTP level). Only identity shims (auth user + role lookup) so
// initializeApp() takes the logged-in-admin path exactly like a real session.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const CHROME = '/Users/jslap018/.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const CONFIG_PATH = '/Users/jslap018/Documents/RudraBalaga-main 2/firebase-config.js';

const SHIM = [
  ';(function(){',
  "  window.addEventListener('unhandledrejection',function(e){(window.__unrej=window.__unrej||[]).push(String((e.reason&&e.reason.message)||e.reason));});",
  "  var fakeAdmin={uid:'probe-admin-uid',email:'probe@test.local',displayName:'Probe Admin'};",
  '  var origOn=window.firebaseAuth.onAuthStateChanged.bind(window.firebaseAuth);',
  '  window.firebaseAuth.onAuthStateChanged=function(cb){return origOn.call(window.firebaseAuth,function(u){setTimeout(function(){window.__authFired=true;cb(u||fakeAdmin);},30);});};',
  "  var snap={exists:true,id:'__probe',data:function(){return{role:'admin'};}};",
  '  var colFn=window.firebaseDb.collection.bind(window.firebaseDb);',
  '  window.firebaseDb.collection=function(name){',
  '    var c=colFn(name);',
  "    if(name==='users'){var docFn=c.doc.bind(c);c.doc=function(uid){var d=docFn(uid);d.get=function(){return Promise.resolve(snap);};return d;};}",
  '    return c;',
  '  };',
  '})();'
].join('\n');

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const logs = [], pageerrs = [], dialogs = [];
  page.on('console', m => logs.push(m.type() + ': ' + m.text().split('\n')[0]));
  page.on('pageerror', e => pageerrs.push(e.message.split('\n')[0]));
  page.on('dialog', async d => { dialogs.push(d.type() + ' :: ' + d.message()); await d.dismiss(); });
  page.on('framenavigated', f => { if (f === page.mainFrame()) logs.push('NAV-> ' + f.url()); });

  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url();
    if (u.endsWith('/firebase-config.js')) {
      req.respond({ status: 200, contentType: 'application/javascript; charset=utf-8', body: fs.readFileSync(CONFIG_PATH, 'utf8') + '\n' + SHIM }).catch(() => {});
    } else if (/firestore\.googleapis\.com/.test(u) && req.method() !== 'GET') {
      req.respond({ status: 403, contentType: 'application/json', body: '{"error":"writes-blocked-by-probe"}' }).catch(() => {});
    } else req.continue().catch(() => {});
  });

  await page.goto('http://localhost:5100/admin.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  try { await page.waitForFunction(() => window.__authFired === true, { timeout: 15000 }); }
  catch { console.log('X boot never fired | pageerrs:', pageerrs.slice(0, 5).join(' | ')); await browser.close(); process.exit(1); }
  await new Promise(r => setTimeout(r, 3000)); // let real snapshots/rules settle

  const env = await page.evaluate(() => ({
    url: location.href,
    stillAdminPage: location.pathname.endsWith('/admin.html'),
    eventsLoaded: Array.isArray(state.events) ? state.events.length : null,
    busEventDocs: Object.keys(state.busRoutes || {}).length,
    hasNewBuildMarker: document.documentElement.outerHTML.includes('outstation event before saving')
  }));
  console.log('ENV:', JSON.stringify(env));

  const seed = await page.evaluate(() => {
    const sel = document.getElementById('bus-routes-users-event-select');
    let eid = sel.value;
    if (!eid && sel.options.length > 1) eid = sel.options[1].value;
    if (!eid) eid = 'evt-probe';
    state.busRoutes[eid] = (state.busRoutes[eid] || []).filter(b => b.id !== 'bus-probe-1');
    state.busRoutes[eid].unshift({ id: 'bus-probe-1', name: 'Probe Bus', number: '', driverNumber: '', routes: [{ id: 'rp1', point: 'Probe Point', time: '09:15' }] });
    let opt = Array.from(sel.options).find(o => o.value === eid);
    if (!opt) { opt = document.createElement('option'); opt.value = eid; opt.textContent = 'Probe Event'; sel.appendChild(opt); }
    sel.value = eid; state.selectedBusId = 'bus-probe-1';
    switchTab('bus-routes-users'); displayBusRoutes();
    return {
      eventId: eid,
      manageVisible: !document.getElementById('bus-management-section').classList.contains('hidden'),
      formPresent: !!document.querySelector('#buses-container form.bus-details-form')
    };
  });
  console.log('SEED:', JSON.stringify(seed));

  // Sentinel: did ANY handler preventDefault this submit? Then press Save like a user would.
  await page.evaluate(() => {
    document.getElementById('buses-container').addEventListener('submit',
      ev => setTimeout(() => { window.__defaultPrevented = ev.defaultPrevented; }, 0), false);
    document.getElementById('bus-detail-number-bus-probe-1').value = 'PROBE 123';
    const f = document.querySelector('#buses-container form.bus-details-form');
    f.requestSubmit(f.querySelector('button[type="submit"]'));
  });
  await new Promise(r => setTimeout(r, 1000));

  let out = null;
  try {
    out = await page.evaluate(() => {
      const t = document.getElementById('toast');
      return {
        stillHere: location.pathname.endsWith('/admin.html'),
        message: document.getElementById('toast-message').textContent,
        visible: !t.classList.contains('hidden') && !t.classList.contains('opacity-0') && !t.classList.contains('translate-x-6'),
        defaultPrevented: typeof window.__defaultPrevented === 'undefined' ? null : window.__defaultPrevented,
        numberAfterReRender: document.querySelector('#buses-container input[id^="bus-detail-number"]')?.value ?? null
      };
    });
  } catch (e) {
    console.log('X NAVIGATION during save (context destroyed) -> delegated handler NOT active!');
    console.log('Dialogs:', dialogs.join(' | ') || '(none)');
    console.log('Page errors:', pageerrs.slice(0, 8).join(' | ') || '(none)');
    await browser.close(); process.exit(1);
  }
  console.log('CLICK RESULT:', JSON.stringify(out));
  console.log('DIALOGS:', dialogs.length ? dialogs.join(' | ') : '(none)');
  console.log('PAGE ERRORS:', pageerrs.length ? pageerrs.slice(0, 8).join(' | ') : '(none)');
  const unrej = await page.evaluate(() => window.__unrej || []).catch(() => []);
  console.log('UNHANDLED REJECTIONS:', JSON.stringify(unrej.slice(0, 5)));
  const interesting = logs.filter(l => l.startsWith('error') || l.startsWith('warning')).slice(0, 10);
  console.log('CONSOLE ERR/WARN:', interesting.length ? interesting.join(' ~ ') : '(none)');

  await browser.close();
  process.exit(out.stillHere && out.visible ? 0 : 1);
})();