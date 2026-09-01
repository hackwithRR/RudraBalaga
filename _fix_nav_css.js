// One-off: harden bottom-nav CSS across all pages (fallbacks for env(), extra breakpoints)
const fs = require('fs');
const files = ['index.html', 'essentials.html', 'events.html', 'bus-routes.html', 'profile.html'];

const OLD = ".app-bottom-nav{position:fixed;left:0;right:0;bottom:0;z-index:50;padding:0 .75rem calc(.65rem + env(safe-area-inset-bottom));pointer-events:none;}";
const NEW = ".app-bottom-nav{position:fixed;left:0;right:0;bottom:0;z-index:50;padding:0 .75rem .65rem;padding:0 .75rem calc(.65rem + constant(safe-area-inset-bottom));padding:0 .75rem calc(.65rem + env(safe-area-inset-bottom));pointer-events:none;}";

const OLD_MEDIA_END = "            .app-nav-item.is-active{gap:.4rem;padding:0 .55rem;}\n        }";
const NEW_MEDIA_END = OLD_MEDIA_END + "\n        }\n        /* Large phones / small tablets (481-640px): keep the pill comfortable */\n        @media (min-width:481px) and (max-width:640px){\n            .app-nav-item{min-height:58px;}\n            .app-nav-icon{font-size:27px !important;}\n            .app-nav-item.is-active .app-nav-icon{font-size:29px !important;}\n            .app-nav-label{font-size:.85rem;}\n            .app-nav-item.is-active{gap:.4rem;}\n        }\n        /* Very narrow screens / large accessibility font sizes */\n        @media (max-width:360px){\n            .app-nav-item{min-height:54px;}\n            .app-nav-icon{font-size:23px !important;}\n            .app-nav-item.is-active .app-nav-icon{font-size:25px !important;}\n            .app-nav-label{font-size:.68rem;}\n            .app-nav-item.is-active{gap:.35rem;padding:0 .45rem;}\n        }";

const OLD_INNER = "border-radius:999px;padding:.45rem;box-shadow:";
const NEW_INNER = "border-radius:999px;padding:.45rem;box-sizing:border-box;box-shadow:";

const OLD_ACTIVE = ".app-nav-item.is-active{flex:1.35 1 0;flex-direction:row;gap:.5rem;";
const NEW_ACTIVE = ".app-nav-item.is-active{flex:1.35 1 0;flex-direction:row;min-width:0;gap:.5rem;";

files.forEach(f => {
    let css = fs.readFileSync(f, 'utf8');
    let changed = [];
    if (css.includes(OLD)) { css = css.split(OLD).join(NEW); changed.push('env-fallback'); }
    if (css.includes(OLD_MEDIA_END)) { css = css.split(OLD_MEDIA_END).join(NEW_MEDIA_END); changed.push('breakpoints'); }
    if (css.includes(OLD_INNER)) { css = css.split(OLD_INNER).join(NEW_INNER); changed.push('box-sizing'); }
    if (css.includes(OLD_ACTIVE)) { css = css.split(OLD_ACTIVE).join(NEW_ACTIVE); changed.push('active-minwidth'); }
    fs.writeFileSync(f, css);
    console.log(f + ': ' + (changed.join(', ') || 'NO CHANGES'));
});
