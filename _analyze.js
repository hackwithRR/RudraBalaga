const fs = require('fs');
const content = fs.readFileSync('admin.html', 'utf8');
const lines = content.split('\n');

// Find the inline script block (the last <script> without src=)
let scriptStart = null;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].match(/<script>/) && !lines[i].includes('src=')) {
    scriptStart = i;
  }
}
console.log('Inline script starts at line', scriptStart + 1);

let backticks = 0, braces = 0, parens = 0, brackets = 0;
for (let i = scriptStart; i < lines.length; i++) {
  const line = lines[i];
  for (const ch of line) {
    if (ch === '`') backticks++;
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '(') parens++;
    if (ch === ')') parens--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }
}
console.log('Backtick total:', backticks, '->', backticks % 2 === 0 ? 'EVEN' : '*** ODD (unmatched!) ***');
console.log('Brace balance:', braces);
console.log('Paren balance:', parens);
console.log('Bracket balance:', brackets);

// Try to extract and syntax-check the script
let scriptEnd = null;
for (let i = scriptStart; i < lines.length; i++) {
  if (lines[i].match(/<\/script>/)) {
    scriptEnd = i;
    break;
  }
}
console.log('Inline script ends at line', scriptEnd + 1);
const scriptText = lines.slice(scriptStart + 1, scriptEnd).join('\n');

// Now try to parse with acorn or just new Function
try {
  new Function(scriptText);
  console.log('Syntax check PASSED');
} catch (e) {
  console.log('Syntax check FAILED:', e.message);
}
