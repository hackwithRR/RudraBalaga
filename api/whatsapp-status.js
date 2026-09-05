/**
 * Vercel Serverless Function — GET /api/whatsapp-status?token=VERIFY_XXXXXX
 *
 * Polling endpoint for the frontend to check whether a WhatsApp
 * verification session has been completed.
 *
 * Returns:
 *   - { status: 'PENDING' } — session exists, awaiting user message
 *   - { status: 'VERIFIED', authToken: '...' } — verified, JWT included
 *   - { status: 'EXPIRED' } — session TTL elapsed
 *   - { status: 'UNKNOWN' } — session not found
 *
 * Environment vars required:
 *   - FIREBASE_SERVICE_ACCOUNT (JSON) for Firestore persistence
 */

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
    // ── CORS ──────────────────────────────────────────────────────────
    const origin = req.headers.origin || '';
    const allowed = (process.env.ALLOWED_ORIGINS || '*').split(',');
    if (allowed.includes('*') || allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

    // ── Validate token param ──────────────────────────────────────────
    const token = req.query.token;
    if (!token || typeof token !== 'string' || !token.startsWith('VERIFY_')) {
        return res.status(400).json({ ok: false, error: 'invalid_token' });
    }

    // ── Look up session in Firestore ──────────────────────────────────
    try {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
            console.error('whatsapp-status: FIREBASE_SERVICE_ACCOUNT not set');
            return res.status(503).json({ ok: false, error: 'server_not_configured' });
        }

        const { default: admin } = await import('firebase-admin');
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
            });
        }
        const db = admin.firestore();
        const sessionRef = db.collection('whatsappSessions').doc(token);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            return res.status(200).json({ ok: true, status: 'UNKNOWN' });
        }

        const sessionData = sessionDoc.data();

        // Check if expired (TTL elapsed but not yet marked)
        const createdAt = sessionData.createdAt || 0;
        if (sessionData.status === 'PENDING' && Date.now() - createdAt > SESSION_TTL_MS) {
            await sessionRef.update({ status: 'EXPIRED' });
            return res.status(200).json({ ok: true, status: 'EXPIRED' });
        }

        // Return verified with auth token
        if (sessionData.status === 'VERIFIED') {
            return res.status(200).json({
                ok: true,
                status: 'VERIFIED',
                authToken: sessionData.authToken,
                phone: sessionData.phone
            });
        }

        // Return rejected with reason
        if (sessionData.status === 'REJECTED') {
            return res.status(200).json({
                ok: true,
                status: 'REJECTED',
                reason: sessionData.reason || 'UNKNOWN'
            });
        }

        // PENDING or EXPIRED
        return res.status(200).json({ ok: true, status: sessionData.status });
    } catch (err) {
        console.error('whatsapp-status: Firestore error:', err);
        return res.status(500).json({ ok: false, error: 'server_error' });
    }
}
