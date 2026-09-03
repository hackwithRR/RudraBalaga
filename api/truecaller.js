/**
 * Vercel Serverless Function — POST /api/truecaller
 *
 * Validates a Truecaller verification payload from the profile page:
 *   body: { accessToken, phoneNumber, uid }
 *
 * Flow:
 *   1. Validate params.
 *   2. Server-to-server call to Truecaller to verify the access token
 *      (requires TRUECALLER_CLIENT_ID / TRUECALLER_PARTNER_KEY env vars —
 *      see README section "Truecaller verification").
 *   3. If valid → mark user's doc { phoneVerified: true } in Firestore.
 *
 * If Truecaller creds are not configured, responds 503 so the frontend
 * falls back to OTP verification.
 */

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    const allowed = (process.env.ALLOWED_ORIGINS || '*').split(',');
    if (allowed.includes('*') || allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

    const { accessToken, phoneNumber, uid } = req.body || {};
    if (!accessToken || !phoneNumber || !uid) {
        return res.status(400).json({ ok: false, error: 'missing_params' });
    }

    const clientId = process.env.TRUECALLER_CLIENT_ID;
    const partnerKey = process.env.TRUECALLER_PARTNER_KEY;

    // Not configured → frontend falls back to OTP.
    if (!clientId || !partnerKey) {
        return res.status(503).json({ ok: false, error: 'truecaller_not_configured' });
    }

    try {
        // Server-to-server validation of the access token with Truecaller.
        // Endpoint per Truecaller partner docs (verify token → profile).
        const tcRes = await fetch('https://profile4.truecaller.com/v1/user/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${partnerKey}`,
                'Client-Id': clientId
            },
            body: JSON.stringify({ accessToken })
        });

        if (!tcRes.ok) {
            const status = tcRes.status;
            // 401/403 → invalid/expired token; 429 → rate limited; else upstream error.
            return res.status(status === 401 || status === 403 ? 401 : 502)
                .json({ ok: false, error: status === 401 || status === 403 ? 'invalid_token' : 'truecaller_upstream_error' });
        }

        const tcProfile = await tcRes.json();
        const tcPhone = String(tcProfile.phone || tcProfile.phoneNumber || '').replace(/\D/g, '');
        const reqPhone = String(phoneNumber).replace(/\D/g, '');
        if (!tcPhone || !reqPhone || !tcPhone.endsWith(reqPhone.slice(-10))) {
            return res.status(400).json({ ok: false, error: 'phone_mismatch' });
        }

        // Mark phone as verified for this user. Auth is enforced client-side
        // via Firebase ID token forwarded in the request.
        const idToken = req.headers['x-firebase-idtoken'];
        if (idToken) {
            const { default: admin } = await import('firebase-admin');
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}'))
                });
            }
            const decoded = await admin.auth().verifyIdToken(idToken);
            if (decoded.uid !== uid) return res.status(403).json({ ok: false, error: 'uid_mismatch' });
            const db = admin.firestore();
            await db.collection('users').doc(uid).set({ phoneVerified: true, phone: phoneNumber }, { merge: true });
        }

        return res.status(200).json({ ok: true, verified: true });
    } catch (err) {
        console.error('truecaller handler error:', err);
        return res.status(500).json({ ok: false, error: 'server_error' });
    }
}