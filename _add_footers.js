// One-off: simplify site footer to a compact branding bar
const fs = require('fs');
const ROOT = '/Users/jslap018/Documents/Rithvik/RudraBalaga-main 2';

const SLIM_FOOTER = `<footer class="site-footer">
        <div class="sf-bar">
            <img src="company.png" alt="Build &amp; Guild logo" class="sf-logo-sm" onerror="this.outerHTML='<span class=&quot;sf-logo-fallback-sm&quot;>B&amp;G</span>'">
            <span class="sf-name">Build &amp; Guild</span>
            <span class="sf-sep"></span>
            <a href="terms">Terms &amp; Conditions</a>
            <a href="privacy">Privacy Policy</a>
            <span class="sf-sep"></span>
            <span class="sf-copy">&copy; ${new Date().getFullYear()} ರುದ್ರ ಬಳಗ · Rudra Parayana</span>
        </div>
    </footer>`;

['index.html', 'events.html', 'essentials.html', 'bus-routes.html', 'profile.html', 'login.html', 'admin.html'].forEach(f => {
    const p = ROOT + '/' + f;
    let html = fs.readFileSync(p, 'utf8');
    const re = /<footer class="site-footer">[\s\S]*?<\/footer>/;
    if (!re.test(html)) { console.log(f + ': no site-footer found!'); return; }
    fs.writeFileSync(p, html.replace(re, SLIM_FOOTER));
    console.log(f + ': footer simplified');
});

