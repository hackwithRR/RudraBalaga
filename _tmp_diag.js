const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox'] });
  for (const [name, file, sel] of [['index', 'index.html', '#view-scripts-btn'], ['essentials', 'essentials.html', '#scriptures-btn']]) {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
    await page.setViewport({ width: 390, height: 800 });
    await page.goto('file:///Users/jslap018/Documents/RudraBalaga-main%202/' + file, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    const diag = await page.evaluate((sel) => {
      const btn = document.querySelector(sel);
      return {
        btnExists: !!btn,
        btnVisible: btn ? btn.offsetParent !== null || getComputedStyle(btn).position === 'fixed' : false,
        openScriptures: typeof window.openScriptures,
        bodyChildren: document.body.children.length,
        hasLoginRedirect: !!document.querySelector('a[href="login.html"]'),
        url: location.href
      };
    }, sel);
    console.log(name, JSON.stringify(diag));
    if (diag.btnExists && diag.openScriptures === 'function') {
      await page.evaluate((sel) => document.querySelector(sel).click(), sel);
      await new Promise(r => setTimeout(r, 500));
      console.log(name, 'overlay after click:', !!(await page.$('.scripture-overlay')));
    }
    errs.slice(0, 5).forEach(e => console.log(name, e));
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
