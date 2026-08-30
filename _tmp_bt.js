const fs = require('fs');
const html = fs.readFileSync('events.html', 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m;
while ((m = re.exec(html))) {
  const code = m[1];
  const bt = (code.match(/`/g) || []).length;
  console.log('backticks in script block: ' + bt + (bt % 2 === 0 ? ' (balanced)' : ' (UNBALANCED!)'));
  const dq = (code.match(/"/g) || []).length;
  const sq = (code.match(/'/g) || []).length;
  console.log('double quotes: ' + dq + ' single quotes: ' + sq);
}
