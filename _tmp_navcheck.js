const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  for (const f of ['index.html', 'events.html']) {
    await page.goto('file:///Users/jslap018/Documents/RudraBalaga-main 2/' + f, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 700));
    const info = await page.evaluate(() => {
      const n = document.querySelector('.app-bottom-nav');
      if (!n) return { found: false };
      const inner = n.querySelector('.app-bottom-nav-inner');
      const a = inner.querySelector('a');
      const cs = getComputedStyle(inner), ca = getComputedStyle(a);
      return { found: true, innerMaxWidth: cs.maxWidth, innerRadius: cs.borderRadius, innerBg: cs.backgroundColor,
        itemWidth: ca.width, itemHeight: ca.height, itemMinHeight: ca.minHeight, itemRadius: ca.borderRadius, itemBg: ca.backgroundColor, itemColor: ca.color };
    });
    console.log(f, JSON.stringify(info));
  }
  console.log('pageErrors:', JSON.stringify(errs));
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
