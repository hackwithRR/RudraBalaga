const admin = require('firebase-admin');
let cred;
try { cred = require('./service-account.json'); } catch {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log("ERROR: Need FIREBASE_SERVICE_ACCOUNT env var or service-account.json file");
    process.exit(1);
  }
  cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
}
admin.initializeApp({ credential: admin.credential.cert(cred) });
const db = admin.firestore();

async function main() {
  console.log("=== FCM TOKENS ===");
  try {
    const snap = await db.collection('fcmTokens').limit(10).get();
    console.log("Count:", snap.size);
    snap.forEach(d => console.log("  UID:", d.data().uid, "token:", d.id.slice(0,10)+"..."));
  } catch(e) { console.log("ERR tokens:", e.message); }
  
  console.log("\n=== PENDING NOTIFICATIONS ===");
  try {
    const pend = await db.collection('notifications').where('pushSent','==',false).limit(10).get();
    console.log("Count:", pend.size);
    pend.forEach(d => console.log("  ", d.data().title, "->", d.data().uid));
  } catch(e) { console.log("ERR pend:", e.message); }
  
  console.log("\n=== RECENT NOTIFICATIONS ===");
  try {
    const recent = await db.collection('notifications').orderBy('createdAt','desc').limit(5).get();
    recent.forEach(d => {
      const dt = d.data().createdAt?.toDate?.()?.toISOString?.() || 'N/A';
      console.log("  ", d.data().title, "| pushSent:", d.data().pushSent, "|", dt);
    });
  } catch(e) { console.log("ERR recent:", e.message); }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });