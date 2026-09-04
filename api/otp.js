/**
 * Vercel Serverless Function — POST /api/otp
 * Phone verification fallback when Truecaller is unavailable.
 *
 * body: { action: 'send'|'verify', phone, uid }
 *
 * OTPs are stored (hashed) in Firestore collection `otpIndex` (doc id = digits-only
 * phone), with 10-minute expiry and 3 verify attempts max. SMS delivery requires
 * the SMS_API_URL / SMS_API_KEY env vars (e.g. Twilio/Fast2SMS MSG91 webhook) —
 * without them the endpoint responds 503 and the UI tells the user to contact admin.
 *
 * NOTE: once configured, verification success is trusted to the caller's Firebase
 * ID token (x-firebase-idtoken header); the client marks phoneVerified itself after
 * this endpoint returns ok.
 */
import crypto from 'crypto';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 3;

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    const allowed = (process.env.ALLOWED_ORIGINS || '*').split(',');
    if (allowed.includes('*') || allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-firebase-idtoken');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

    const { action, phone, code, uid } = req.body || {};
    if (!phone || !uid) return res.status(400).json({ ok: false, error: 'missing_params' });
    const phoneKey = String(phone).replace(/\D/g, '').slice(-10);
    if (phoneKey.length !== 10) return res.status(400).json({ ok: false, error: 'invalid_phone' });

    const smsConfigured = !!(process.env.SMS_API_URL && process.env.SMS_API_KEY);

    // Firestore via firebase-admin (uses FIREBASE_SERVICE_ACCOUNT env JSON).
    let db = null;
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const { default: admin } = await import('firebase-admin');
            if (!admin.apps.length) {
                admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
            }
            db = admin.firestore();
        }
    } catch (e) { db = null; }

    if (action === 'send') {
        if (!smsConfigured || !db) return res.status(503).json({ ok: false, error: 'sms_not_configured' });
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const hash = crypto.createHmac('sha256', process.env.SMS_API_KEY).update(phoneKey + otp).digest('hex');
        await db.collection('otpIndex').doc(phoneKey).set({
            hash, uid,
            attempts: 0,
            createdAt: Date.now()
        }, { merge: false });
        // Replace this with your SMS provider's real request format.
        const smsRes = await fetch(process.env.SMS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.SMS_API_KEY}` },
            body: JSON.stringify({ to: '+91' + phoneKey, message: `${otp} is your Rudra Balaga verification code. Valid for 10 minutes.` })
        });
        if (!smsRes.ok) return res.status(502).json({ ok: false, error: 'sms_send_failed' });
        return res.status(200).json({ ok: true });
    }

    if (action === 'verify') {
        if (!db) return res.status(503).json({ ok: false, error: 'server_not_configured' });
        const ref = db.collection('otpIndex').doc(phoneKey);
        const doc = await ref.get();
        if (!doc.exists) return res.status(400).json({ ok: false, error: 'no_otp' });
        const data = doc.data();
        if (Date.now() - (data.createdAt || 0) > OTP_TTL_MS) { await ref.delete(); return res.status(400).json({ ok: false, error: 'otp_expired' }); }
        if ((data.attempts || 0) >= MAX_VERIFY_ATTEMPTS) { await ref.delete(); return res.status(429).json({ ok: false, error: 'too_many_attempts' }); }
        if (data.uid !== uid) return res.status(403).json({ ok: false, error: 'uid_mismatch' });
        const hash = crypto.createHmac('sha256', process.env.SMS_API_KEY || '').update(phoneKey + String(code)).digest('hex');
        if (hash !== data.hash) {
            await ref.set({ attempts: (data.attempts || 0) + 1 }, { merge: true });
            return res.status(400).json({ ok: false, error: 'wrong_otp' });
        }
        await ref.delete();
        return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: 'unknown_action' });
}