const fs = require('fs');
const p = '/Users/jslap018/Documents/Rithvik/RudraBalaga-main 2/admin.html';
let html = fs.readFileSync(p, 'utf8');

const marker = '// Build stamp - printed to console on every load';
const mi = html.indexOf(marker);
if (mi < 0) { console.error('marker not found'); process.exit(1); }
const startTag = html.lastIndexOf('<script>', mi);
const endIdx = html.indexOf('</script>', mi);
if (startTag < 0 || endIdx < 0) { console.error('bounds not found'); process.exit(1); }

const code = html.slice(startTag + '<script>'.length, endIdx);
fs.writeFileSync('/Users/jslap018/Documents/Rithvik/RudraBalaga-main 2/admin-app.js', code);

html = html.slice(0, startTag) + '<script src="admin-app.js"></script>' + html.slice(endIdx + '</script>'.length);
fs.writeFileSync(p, html);
console.log('extracted', code.length, 'chars -> admin-app.js; admin.html now', html.length, 'bytes,', html.split('\n').length, 'lines');
