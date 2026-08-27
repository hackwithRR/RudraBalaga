// Quick geometry probe for the centered toast
const puppeteer = require('puppeteer-core');
const CHROME = '/Users/jslap018/.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:5100/admin.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 1500));
  const g = await page.evaluate(() => {
    const t = document.getElementById('toast');
    t.classList.remove('hidden');
    return {
      cls: t.className,
      viewport: [window.innerWidth, window.innerHeight],
      rect: (r => ({ l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) }))(t.getBoundingClientRect()),
      computedTop: getComputedStyle(t).top,
      computedLeft: getComputedStyle(t).left,
      transform: getComputedStyle(t).transform,
      parentIsBody: t.parentElement === document.body,
      docScrollY: window.scrollY,
      transformedAncestors: (() => {
        const out = [];
        let el = t.parentElement;
        while (el && el !== document.documentElement) {
          const cs = getComputedStyle(el);
          const hit = cs.transform !== 'none' || cs.filter !== 'none' || cs.willChange !== 'auto'
            || cs.perspective !== 'none' || cs.backdropFilter !== 'none' || cs.zoom !== '1'
            || cs.contain !== 'none' || cs.contentVisibility !== 'visible';
          out.push({ tag: el.tagName + (el.id ? '#' + el.id : '') + '.' + String(el.className).slice(0, 30),
            transform: cs.transform.slice(0, 60), willChange: cs.willChange, zoom: cs.zoom,
            contain: cs.contain, cv: cs.contentVisibility, bdf: cs.backdropFilter });
          el = el.parentElement;
        }
        return out;
      })(),
      beforeMove: (r => ({ cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) }))(t.getBoundingClientRect()),
      afterMoveToBody: (() => {
        document.body.appendChild(t); // relocate
        const r = t.getBoundingClientRect();
        return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) };
      })()
    };
  });
  console.log(JSON.stringify(g, null, 2));
  await browser.close();
})();