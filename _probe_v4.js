// Probe v4: capture RAW stacks unfiltered -> determine doc-relative vs script-relative reporting.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = '/Users/jslap018/.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const TMP = '/tmp/_cline_probe_v4';
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

function pad(n){const o=[];for(let i=1;i<=n;i++)o.push('// filler '+i);return o.join('\n');}

// Doc layout: script opens at DOC line P1; template opened at DOC line T1.
// If Chrome reports DOC-relative -> location ~= total lines at EOF region (col 1).
// If SCRIPT-relative -> location = (T1 - P1) area.
function makeDoc(preLines, junkInsideScript) {
  const parts = ['<!DOCTYPE html><html><head>', pad(preLines), '</head><body>',
    '<script>',                       // script opens
    '// s-line 1',
    'function f(){',
    '   const s = `unterminated',     // template left open -> EOF inside string
    junkInsideScript ? pad(junkInsideScript) : null,
    '</script>',
    '</body></html>'].filter(x => x !== null);
  const html = parts.join('\n');
  const p = path.join(TMP, `doc_${preLines}.html`);
  fs.writeFileSync(p, html);
  const src = html.split('\n');
  return { p, total: src.length, scriptAt: src.findIndex(l => l.trim() === '<script>') + 1 };
}

(async () => {
  const variants = [makeDoc(30, 15), makeDoc(60, 40)];
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  for (const v of variants) {
    const errs = [];
    const onPageError = err => errs.push('MESSAGE: ' + err.message + '\nRAW STACK:\n' + (err.stack || '(none)'));
    page.on('pageerror', onPageError);
    await page.goto('file://' + v.p, { waitUntil: 'domcontentloaded' }).catch(e => errs.push('NAV: ' + e.message));
    await new Promise(r => setTimeout(r, 350));
    page.off('pageerror', onPageError);
    console.log(`\n### ${v.p.split('/').pop()} | doc_total=${v.total} | '<script>' at doc-line ${v.scriptAt}`);
    console.log(`DOC line where parser sees EOF = ${v.total} (last line of received bytes)`);
    errs.length ? errs.forEach(e => console.log(e)) : console.log('(no errors)');
  }
  await browser.close();
})();
