const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  for (const w of [360, 390, 414]) {
    await page.setViewport({ width: w, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto('file:///Users/jslap018/Documents/RudraBalaga-main%202/index.html', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 700));
    const r = await page.evaluate(() => {
      const n = document.querySelector('.app-bottom-nav');
      if (!n) return { redirected: true };
      const inner = n.querySelector('.app-bottom-nav-inner');
      const items = [...inner.querySelectorAll('.app-nav-item')];
      const labels = items.map(i => { const l = i.querySelector('.app-nav-label'); return l ? { text: l.textContent.trim(), w: Math.round(l.getBoundingClientRect().width), clipped: l.scrollWidth > l.clientWidth + 1 } : null; });
      const ir = inner.getBoundingClientRect();
      return {
        barWidth: Math.round(ir.width),
        overflowsViewport: ir.right > window.innerWidth || ir.left < 0,
        items: items.map(i => { const b = i.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; }),
        labels,
        docHorizScroll: document.documentElement.scrollWidth > window.innerWidth
      };
    });
    console.log(w, JSON.stringify(r));
  }
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
