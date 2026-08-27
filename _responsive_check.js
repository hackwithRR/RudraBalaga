// Responsive validation probe for admin.html
// - Serves the project folder over localhost
// - Stubs ALL Firebase traffic (no production access)
// - Boots the real admin UI, walks through every tab + modals at 4 viewports,
//   reports horizontal overflow offenders + JS errors, saves screenshots.
const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer-core');

const ROOT = __dirname;
const CHROME = '/Users/jslap018/.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const SHOTS = path.join(ROOT, '_responsive_shots');
fs.mkdirSync(SHOTS, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ico': 'image/x-icon' };

// ---------- Firebase stubs ----------
const FIREBASE_STUBS = {
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js': '',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js': '',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js': '',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js': '',
};

const CONFIG_STUB = `
const firebaseConfig = { apiKey:"stub", authDomain:"stub", projectId:"stub" };
const paymentConfig = { upiId:"stub@bank", appName:"Rudra Balaga" };
const donationConfig = { appName:"Rudra Balaga", upiId:"stub@bank", bankTransfer:{}, note:"" };
function __makeSnap(list) {
  const docs = list.map(d => ({ id: d.__id || d.id, exists: true, data: () => d }));
  const snap = (fn) => docs.forEach(fn);
  snap.forEach = snap; snap.docs = docs; snap.size = docs.length; snap.empty = docs.length === 0;
  return snap;
}
const __shimUser = { uid: 'u-admin-test', email: 'admin@rudra.test', displayName: 'Test Admin' };
var firebase = {
  initializeApp(){},
  auth(){ return null; },
  firestore(){ return null; }
};
var firebaseAuth = {
  get currentUser(){ return __shimUser; },
  onAuthStateChanged(cb){ setTimeout(() => cb(__shimUser), 20); return function(){}; },
  signOut(){ return Promise.resolve(); }
};
var firebaseDb = {
  collection(name){
    const data = [];
    const wrapDocs = () => __makeSnap(data.map(d => ({ ...d })));
    const api = {
      doc(id){
        return {
          get(){
            if (name === 'users' && id === 'u-admin-test') {
              return Promise.resolve({ exists:true, id, data: () => ({ role:'admin', name:'Test Admin' }) });
            }
            return Promise.resolve({ exists:false, id, data: () => ({}) });
          },
          set(){ return Promise.resolve(); },
          update(){ return Promise.resolve(); },
          delete(){ return Promise.resolve(); }
        };
      },
      orderBy(){ return api; },
      limit(){ return api; },
      where(){ return api; },
      onSnapshot(cb){ setTimeout(() => cb(wrapDocs()), 10); },
      get(){ return Promise.resolve(wrapDocs()); }
    };
    return api;
  }
};
`;

// ---------- Static server ----------
function startServer() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://x');
      if (FIREBASE_STUBS[url.pathname]) { res.writeHead(200, {'Content-Type':'text/javascript'}); res.end(FIREBASE_STUBS[url.pathname]); return; }
      if (url.pathname === '/firebase-config.js') { res.writeHead(200, {'Content-Type':'text/javascript'}); res.end(CONFIG_STUB); return; }
      const p = path.join(ROOT, decodeURIComponent(url.pathname));
      if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      try {
        const body = fs.readFileSync(p);
        res.writeHead(200, {'Content-Type': MIME[path.extname(p)] || 'application/octet-stream'});
        res.end(body);
      } catch(e) { res.writeHead(404); res.end('not found'); }
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

// >>> PART2 <<<
