const fs = require('fs');
const out = [];
for (const f of ['admin.html', 'qr-attendance.html', 'index.html']) {
  const html = fs.readFileSync(f, 'utf8');
  const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];
  let i = 0;
  for (const m of scripts) {
    i++;
    try { new Function(m[1]); out.push(f + ' script #' + i + ': OK'); }
    catch (e) { out.push(f + ' script #' + i + ': ERROR ' + e.message); }
  }
}
console.log(out.join('\n'));
