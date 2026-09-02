// One-off: patch login/admin with the Samsung font-boosting fix
const fs = require('fs');
const ROOT = '/Users/jslap018/Documents/Rithvik/RudraBalaga-main 2';
const fix = '\n/* Samsung Internet font-boosting fix (whole app consistency) */\nhtml{-webkit-text-size-adjust:100%;text-size-adjust:100%;}\nbody,main,article,section,header,footer,nav,p,span,li,a,button,h1,h2,h3,h4,h5,h6,label{max-height:999999px;}\n';
['login.html', 'admin.html'].forEach(f => {
    const p = ROOT + '/' + f;
    let h = fs.readFileSync(p, 'utf8');
    if (h.includes('font-boosting fix')) { console.log(f + ': already patched'); return; }
    const i = h.indexOf('<style>');
    if (i < 0) { console.log(f + ': no <style> found'); return; }
    fs.writeFileSync(p, h.slice(0, i + 7) + fix + h.slice(i + 7));
    console.log(f + ': patched');
});
