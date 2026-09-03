const fs = require('fs');
const base = '/Users/jslap018/Documents/Rithvik/RudraBalaga-main 2/';
const pages = ['index.html', 'essentials.html', 'bus-routes.html', 'profile.html'];

function removeInlineFn(src) {
  const start = src.indexOf('function showHelpModal() {');
  if (start === -1) return src; // already removed
  // include preceding comment line if present
  let cutStart = start;
  const lineStart = src.lastIndexOf('\n', start) + 1;
  const before = src.slice(lineStart, start);
  if (/\/\/[^\n]*help/i.test(before)) cutStart = lineStart;
  else if (src.slice(lineStart, start).trim() === '') cutStart = lineStart;
  // brace walk
  let i = src.indexOf('{', start), depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  if (depth !== 0) throw new Error('unbalanced braces');
  let end = i + 1;
  if (src[end] === '\n') end++;
  return src.slice(0, cutStart) + src.slice(end);
}

for (const f of pages) {
  const p = base + f;
  let s = fs.readFileSync(p, 'utf8');
  const hadInline = s.includes('function showHelpModal() {');
  s = removeInlineFn(s);
  // dedupe possible leftover double blank lines
  s = s.replace(/\n\n\n+/g, '\n\n');
  if (!s.includes('help-modal.js')) {
    s = s.replace('<script src="language-switch.js"></script>', '<script src="help-modal.js"></script>\n<script src="language-switch.js"></script>');
  }
  if (!s.includes('help-modal.js')) { console.error('include insert failed for', f); process.exit(1); }
  fs.writeFileSync(p, s);
  console.log(f, hadInline ? 'inline removed' : 'no inline (ok)', '+ include added');
}
