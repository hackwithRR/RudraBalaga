// One-off: extract inline scripture HTML from scriptures.js into scriptures/<id>.txt
const fs = require('fs');
const path = require('path');
const ROOT = '/Users/jslap018/Documents/Rithvik/RudraBalaga-main 2';
const src = fs.readFileSync(path.join(ROOT, 'scriptures.js'), 'utf8');
const ids = [...src.matchAll(/\{ id: '([^']+)', kn:/g)].map(m => m[1]);

function extractContent(id) {
    const i = src.indexOf("id: '" + id + "'");
    if (i < 0) return null;
    const nextEntry = src.indexOf("{ id: '", i + 5);
    const arrEnd = src.indexOf('];', i);
    const end = Math.min(nextEntry < 0 ? Infinity : nextEntry, arrEnd);
    const ci = src.indexOf('content:', i);
    if (ci < 0 || ci >= end) return null;
    let p = src.indexOf(':', ci) + 1;
    while (/\s/.test(src[p])) p++;
    const q = src[p];
    let j = p + 1, out = '';
    while (j < src.length) {
        if (src[j] === '\\') { out += src[j] + src[j + 1]; j += 2; continue; }
        if (src[j] === q) break;
        out += src[j]; j++;
    }
    let rest = src.slice(j + 1);
    while (/^\s*\+\s*['"]/.test(rest)) {
        const m = rest.match(/^\s*\+\s*(['"])([\s\S]*?)\1/);
        if (!m) break;
        out += m[2]; rest = rest.slice(m[0].length);
    }
    if (q === "'") {
        // single-quoted: \' is a plain apostrophe, raw " must be escaped for JSON
        out = out.replace(/\\'/g, "'").replace(/(^|[^\\])"/g, '$1\\"');
    }
    return JSON.parse('"' + out + '"');
}

function htmlToText(h) {
    return h.replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]+>/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
}

const dir = path.join(ROOT, 'scriptures');
fs.mkdirSync(dir, { recursive: true });
const out = [];
ids.forEach(id => {
    const c = extractContent(id);
    if (c) {
        fs.writeFileSync(path.join(dir, id + '.txt'), htmlToText(c) + '\n');
        out.push(id);
    } else {
        out.push(id + ' (no inline content — placeholder)');
    }
});
console.log(out.join('\n'));
