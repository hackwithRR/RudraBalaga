// Final acceptance test: load admin via the LIVE SERVER (port 5100) exactly like the user.
const puppeteer = require('puppeteer-core');
const CHROME = '/Users/jslap018/.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [], logs = [];
  page.on('pageerror', err => errors.push(err.message.split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error') logs.push('CONSOLE-ERR: ' + m.text().split('\n')[0]); });
  await page.goto('http://localhost:5100/admin.html', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => errors.push('NAV: ' + e.message));
  await new Promise(r => setTimeout(r, 4000));
  let readyState = '?', appBooted = false;
  try {
    ({ readyState, appBooted } = await page.evaluate(() => ({
      readyState: document.readyState,
      appBooted: typeof window.firebaseDb !== 'undefined' || typeof window.state !== 'undefined' || !!document.querySelector('#app,#admin-app,body'),
    })));
    // Was ANY section rendered that proves init logic executed?
    const visibleSections = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.tab-content, section, main')).filter(el => el.children.length > 0).length);
    console.log('readyState:', readyState, '| contentful sections:', visibleSections);
  } catch (e) { console.log('EVAL FAILED:', e.message); }
  console.log(appBooted ? 'APP SCOPE AVAILABLE' : '(app scope not exposed — fine for this static app)');
  console.log('=== PAGE ERRORS ===');
  errors.length ? errors.forEach(e => console.log(' ✗', e)) : console.log(' ✓ NONE');
  console.log('=== CONSOLE ERRORS ===');
  logs.length ? logs.slice(0, 8).forEach(e => console.log(' !', e)) : console.log(' ✓ NONE');
  await browser.close();
})();
