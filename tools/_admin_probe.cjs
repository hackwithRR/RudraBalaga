const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = '/Users/jslap018/Documents/Rithvik/RudraBalaga-main 2';
const server = http.createServer((req, res) => {
  let f = req.url.split('?')[0].replace(/^\//, '') || 'index.html';
  if (!path.extname(f)) f += '.html';
  const fp = path.join(root, f);
  if (fs.existsSync(fp)) { res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : 'text/javascript'); res.end(fs.readFileSync(fp)); }
  else { res.statusCode = 404; res.end('nf'); }
});
server.listen(8936, async () => {
  const browser = await puppeteer.launch({ headless: 'new', channel: 'chrome' });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await page.goto('http://localhost:8936/admin.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 4000));
  const state = await page.evaluate(() => ({
    scriptsLoaded: [...document.querySelectorAll('script[src]')].every(s => s.src),
    adminAppLoaded: typeof window.state === 'object' || !!document.querySelector('script[src="admin-app.js"]'),
    hasTakeAttendance: typeof takeAttendance === 'function',
    hasGenerateQr: typeof generateAttendanceQR === 'function',
    buildStamp: (typeof APP_BUILD !== 'undefined') ? APP_BUILD : null
  }));
  console.log('STATE:', JSON.stringify(state, null, 1));
  await browser.close(); server.close(); process.exit(0);
});
