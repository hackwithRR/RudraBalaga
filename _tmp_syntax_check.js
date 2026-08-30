const fs = require('fs');
const f = 'events.html';
const html = fs.readFileSync(f, 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, i = 0;
while ((m = re.exec(html))) {
    i++;
    const code = m[1];
    try { new Function(code); console.log('script#' + i + ' OK, len=' + code.length); }
    catch (e) {
        console.log('script#' + i + ' ERROR: ' + e.message);
        const lines = code.split('\n');
        let shown = 0;
        for (let li = 0; li < lines.length && shown < 8; li++) {
            if (lines[li].includes('<')) { console.log('  line ' + (li + 1) + ': ' + lines[li].slice(0, 160)); shown++; }
        }
    }
}
