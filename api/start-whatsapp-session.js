/**
 * Vercel Serverless Function — POST /api/start-whatsapp-session
 *
 * Generates a short-lived WhatsApp verification session token and returns
 * a pre-filled wa.me deep-link URL for the user to click.
 *
 * The user sends the token to our WhatsApp Business number. The webhook
 * (/api/webhook) captures the incoming message and marks the session
 * as VERIFIED with the sender's phone number.
 *
 * Flow:
 *   1. Generate a cryptographically random session token (VERIFY_XXXXXX).
 *   2. Store it in Firestore `whatsappSessions` with status PENDING and 5-min TTL.
 *     3. Return the token + wa.me deep-link URL.
 *
 * Environment vars required:
 *   - WHATSAPP_PHONE_NUMBER (e.g. 919019897682)
 *   - FIREBASE_SERVICE_ACCOUNT (JSON) for Firestore persistence
 */

import crypto from 'crypto';

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes
const TOKEN_BYTES = 3; // 6 hex chars after VERIFY_

export default async function handler(req, res) {
    // ── CORS ──────────────────────────────────────────────────────────
    const origin = req.headers.origin || '';
    const allowed = (process.env.ALLOWED_ORIGINS || '*').split(',');
    if (allowed.includes('*') || allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

    // ── Validate env ──────────────────────────────────────────────────
    const waPhone = process.env.WHATSAPP_PHONE_NUMBER;
    if (!waPhone) {
        console.error('start-whatsapp-session: WHATSAPP_PHONE_NUMBER not set');
        return res.status(503).json({ ok: false, error: 'whatsapp_not_configured' });
    }

    // ── Generate secure token ─────────────────────────────────────────
    const randomPart = crypto.randomBytes(TOKEN_BYTES).toString('hex').toUpperCase();
    const sessionToken = `VERIFY_${randomPart}`;

    // ── Get expected phone from request body ────────────────────────────
    // The frontend sends the phone number the user entered in their profile.
    // This is used to verify that the WhatsApp message comes from the same number.
    const expectedPhone = (req.body?.phone || '').replace(/\D/g, '');

    // ── Store in Firestore ────────────────────────────────────────────
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const { default: admin } = await import('firebase-admin');
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
                });
            }
            const db = admin.firestore();
            await db.collection('whatsappSessions').doc(sessionToken).set({
                status: 'PENDING',
                phone: null,
                expectedPhone: expectedPhone,
                createdAt: Date.now(),
                expiresAt: Date.now() + SESSION_TTL_MS
            }, { merge: false });
        } else {
            // Without Firestore, we cannot persist sessions. Return 503.
            console.error('start-whatsapp-session: FIREBASE_SERVICE_ACCOUNT not set');
            return res.status(503).json({ ok: false, error: 'server_not_configured' });
        }
    } catch (err) {
        console.error('start-whatsapp-session: Firestore write failed:', err);
        return res.status(500).json({ ok: false, error: 'session_create_failed' });
    }

    // ── Build wa.me deep-link ─────────────────────────────────────────
    // The text body is the token itself. wa.me opens WhatsApp with a pre-filled message.
    const textParam = encodeURIComponent(sessionToken);
    const whatsappUrl = `https://wa.me/${waPhone}?text=${textParam}`;

    return res.status(200).json({
        ok: true,
        sessionToken,
        whatsappUrl,
        expiresIn: SESSION_TTL_MS
    });
}
