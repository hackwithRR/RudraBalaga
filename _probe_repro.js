// Probe v3: exact reproduction attempt.
// Tests: (a) how Chrome reports inline-script unterminated-code locations,
//        (b) whether TRUNCATED PREFIXES of real project files reproduce
//            "Uncaught SyntaxError: Unexpected end of input (at admin.html:NNNN:1)".
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = '/Users/jslap018/.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const TMP = '/tmp/_cline_probe_v3';
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const W2   = '/Users/jslap018/Documents/RudraBalaga-main 2/admin.html';
const MAIN = '/Users/jslap018/Documents/RudraBalaga-main/admin.html';
const BK_W2 = '/Users/jslap018/Documents/RudraBalaga-main 2/admin_backup_broken_20260713_155212.html';

function sliceToLine(srcFile, uptoLine, outName, closeIt) {
  const lines = fs.readFileSync(srcFile, 'utf8').split('\n').slice(0, uptoLine);
  let out = lines.join('\n');
  // Optionally terminate HTML properly while KEEPING JS unterminated is impossible via </script>
  // (it would end the script cleanly making it BALANCED-or-mismatched rather than EOF);
  // so default: raw prefix -> HTML parser hits EOF inside script-data state.
  if (closeIt === false) { /* raw prefix, no closing tags */ }
  fs.writeFileSync(path.join(TMP, outName), out, 'utf8');
  return path.join(TMP, outName);
}

function pad(n){const o=[];for(let i=1;i<=n;i++)o.push('// filler '+i);return o.join('\n');}

const files = [];

// Synthetic control: doc of known length with unterminated template inside proper <script>..</script>
files.push({ tag: 'SYNTH_100', p: (() => {
  const html = ['<!DOCTYPE html><html><head>', pad(90), '</head><body>',
    '<script>', 'const s = `unterminated', '</script>', '</body></html>'].join('\n');
  const p = path.join(TMP, 'SYNTH_100.html'); fs.writeFileSync(p, html); return p;
})() });

// Real-slice candidates: sibling full/prefixes, working-copy prefix, backup whole+tail
files.push({ tag: 'MAIN_full', p: MAIN });
for (const n of [3121, 3122, 3123, 3124]) {
  files.push({ tag: `MAIN_slice_${n}`, p: sliceToLine(MAIN, n, `MAIN_slice_${n}.html`) });
}
files.push({ tag: 'W2_slice_3123', p: sliceToLine(W2, 3123, 'W2_slice_3123.html') });
files.push({ tag: 'BACKUP_full', p: BK_W2 });
const bkLines = fs.readFileSync(BK_W2, 'utf8').split('\n').length;
for (const n of [bkLines - 200]) {
  files.push({ tag: `BACKUP_tail_from_line${n}`, p: (() => {
    const keep = fs.readFileSync(BK_W2, 'utf8').split('\n').slice(n).join('\n');
    const p = path.join(TMP, `BK_tail_${n}.html`);
    fs.writeFileSync(p, '<!DOCTYPE html><html><head></head><body>\n<script>\n' + keep);
    return p;
  })(), note: `backup lines=${bkLines}` });
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  for (const f of files) {
    const errs = [];
    const onPageError = err => errs.push((err.stack || err.message));
    page.on('pageerror', onPageError);
    await page.goto('file://' + f.p, { waitUntil: 'domcontentloaded' }).catch(e => errs.push('NAV: ' + e.message));
    await new Promise(r => setTimeout(r, 350));
    page.off('pageerror', onPageError);
    console.log(`\n### ${f.tag}${f.note ? ' (' + f.note + ')' : ''}`);
    if (!errs.length) console.log('    (no page errors)');
    errs.slice(0, 4).forEach(e => console.log(e.split('\n').filter(l => l.includes('Syntax') || l.includes('.html:') || l.includes('admin')).join('\n')));
  }
  await browser.close();
})();
