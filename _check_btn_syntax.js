const fs = require('fs');
const out = [];
const src = fs.readFileSync('/Users/jslap018/Documents/RudraBalaga-main 2/bus-routes.html', 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, i = 0, ok = true;
while ((m = re.exec(src)) !== null) {
  i++;
  try {
    new Function(m[1]);
    out.push('inline script #' + i + ': OK (' + m[1].length + ' chars)');
  } catch (err) {
    ok = false;
    out.push('inline script #' + i + ': SYNTAX ERROR -> ' + err.message);
  }
}
out.push('edit-pickup-btn count: ' + (src.match(/edit-pickup-btn/g) || []).length);
out.push('swap_horiz icon present: ' + src.includes('swap_horiz'));
out.push('old text-only button gone: ' + !src.includes('edit-pickup-btn touch-active text-primary'));
out.push(ok ? 'ALL SCRIPTS PARSE OK' : 'FAILED');
fs.writeFileSync('/Users/jslap018/Documents/RudraBalaga-main 2/_check_btn_result.txt', out.join('\n'));
console.log(out.join('\n'));
