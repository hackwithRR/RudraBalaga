// Extraction helper (run once, then delete)
const fs = require('fs');
const src = fs.readFileSync('/Users/jslap018/Documents/RudraBalaga-main 2/index.html', 'utf8');

function extractDiv(id) {
    const marker = `id="${id}"`;
    const start = src.indexOf(marker);
    if (start === -1) return null;
    const openTagStart = src.lastIndexOf('<div', start);
    // find matching closing </div> accounting for nesting
    let i = src.indexOf('>', start) + 1;
    let depth = 1;
    while (depth > 0 && i < src.length) {
        const nextOpen = src.indexOf('<div', i);
        const nextClose = src.indexOf('</div>', i);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) { depth++; i = src.indexOf('>', nextOpen) + 1; }
        else { depth--; i = nextClose + 6; }
    }
    return src.slice(openTagStart, i);
}

const chamakam = extractDiv('chamakam-content');
const namakam = extractDiv('namakam-content');
fs.writeFileSync('/tmp/chamakam.html', chamakam || '');
fs.writeFileSync('/tmp/namakam.html', namakam || '');
console.log('chamakam len:', chamakam ? chamakam.length : null);
console.log('namakam len:', namakam ? namakam.length : null);
