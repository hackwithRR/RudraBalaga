const fs = require('fs');
const files = ['admin.html', 'index.html', 'events.html'];
let failed = false;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const re = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g;
  let m, i = 0;
  while ((m = re.exec(html)) !== null) {
    const code = m[1];
    if (!code.trim()) continue;
    try {
      new Function(code);
      console.log(f + ' script#' + i + ': OK (' + code.length + ' chars)');
    } catch (err) {
      failed = true;
      console.log(f + ' script#' + i + ': SYNTAX ERROR -> ' + err.message);
    }
    i++;
  }
}
process.exit(failed ? 1 : 0);
