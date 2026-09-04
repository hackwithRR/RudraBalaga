/**
 * Vercel Serverless Function — GET/POST /api/webhook
 *
 * GET  — Meta webhook handshake (verify token validation).
 * POST — Incoming WhatsApp message listener.
 *
 * Meta sends a POST for every message event. We parse the payload,
 * extract the sender's phone and message body, and if the body starts
 * with "VERIFY_" we look up the session token in Firestore and mark
 * it as VERIFIED with the sender's phone number.
 *
 * Environment vars required:
 *   - META_VERIFY_TOKEN — custom secret for handshake validation
 *   - JWT_SECRET — secret used to sign auth tokens for verified users
 *   - FIREBASE_SERVICE_ACCOUNT (JSON) for Firestore persistence
 */

import jwt from 'jsonwebtoken';

// ═══════════════════════════════════════════════════════════════════════
// TypeScript-style JSDoc type definitions for Meta Webhook payload
// ═══════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} MetaWebhookText
 * @property {string} body - The message text content
 */

/**
 * @typedef {Object} MetaWebhookMessage
 * @property {string} from - Sender's phone number (e.g. "91XXXXXXXXXX")
 * @property {string} id - WhatsApp message ID
 * @property {string} timestamp - Unix timestamp string
 * @property {string} type - Message type ("text", "image", etc.)
 * @property {MetaWebhookText} [text] - Text body (present when type="text")
 */

/**
 * @typedef {Object} MetaWebhookContact
 * @property {{ wa_id: string }} profile - Contact profile
 * @property {string} wa_id - WhatsApp ID (phone number)
 */

/**
 * @typedef {Object} MetaWebhookValue
 * @property {string} messaging_product - Always "whatsapp"
 * @property {Object} metadata - Display phone number info
 * @property {string} metadata.display_phone_number
 * @property {string} metadata.phone_number_id
 * @property {MetaWebhookContact[]} [contacts] - Contact info
 * @property {MetaWebhookMessage[]} [messages] - Incoming messages
 * @property {Object[]} [statuses] - Message status updates
 */

/**
 * @typedef {Object} MetaWebhookChange
 * @property {MetaWebhookValue} value - The change payload
 * @property {string} field - The field that changed
 */


// ═══════════════════════════════════════════════════════════════════════
// Handshake (GET)
// ═══════════════════════════════════════════════════════════════════════

function handleHandshake(req, res) {
    const { 'hub.mode': mode, 'hub.verify_token': verifyToken, 'hub.challenge': challenge } = req.query;

    if (mode === 'subscribe' && verifyToken === process.env.META_VERIFY_TOKEN) {
        console.log('webhook: handshake verified');
        return res.status(200).send(challenge);
    }

    console.warn('webhook: handshake failed — invalid verify_token');
    return res.status(403).send('Verification failed');
}

// ═══════════════════════════════════════════════════════════════════════
// Incoming message processor (POST)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Process the Meta webhook payload to find and verify WhatsApp sessions.
 * @param {MetaWebhookPayload} body
 */
async function processIncomingMessage(body) {
    try {
        const entries = body?.entries;
        if (!entries || !Array.isArray(entries)) {
            console.log('webhook: no entries in payload');
            return;
        }

        for (const entry of entries) {
            const changes = entry?.changes;
            if (!changes || !Array.isArray(changes)) continue;

            for (const change of changes) {
                const value = change?.value;
                if (!value) continue;

                // Only process incoming messages (not statuses)
                const messages = value.messages;
                if (!messages || !Array.isArray(messages)) continue;

                for (const message of messages) {
                    await processSingleMessage(message);
                }
            }
        }
    } catch (err) {
        console.error('webhook: error processing payload:', err);
    }
}


/**
 * Process a single incoming message — check for VERIFY_ token.
 * @param {MetaWebhookMessage} message
 */
async function processSingleMessage(message) {
    // Only handle text messages
    if (message.type !== 'text') return;

    const textBody = message.text?.body?.trim();
    if (!textBody || !textBody.startsWith('VERIFY_')) return;

    const userPhone = message.from; // e.g. "91XXXXXXXXXX"
    const sessionToken = textBody;

    console.log(`webhook: received token ${sessionToken} from ${userPhone}`);

    // Look up the session in Firestore
    try {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
            console.error('webhook: FIREBASE_SERVICE_ACCOUNT not set');
            return;
        }

        const { default: admin } = await import('firebase-admin');
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
            });
        }
        const db = admin.firestore();
        const sessionRef = db.collection('whatsappSessions').doc(sessionToken);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            console.warn(`webhook: session ${sessionToken} not found`);
            return;
        }

        const sessionData = sessionDoc.data();

        // Check if already verified
        if (sessionData.status === 'VERIFIED') {
            console.log(`webhook: session ${sessionToken} already verified`);
            return;
        }

        // Check expiry
        const createdAt = sessionData.createdAt || 0;
        if (Date.now() - createdAt > SESSION_TTL_MS) {
            console.warn(`webhook: session ${sessionToken} expired`);
            await sessionRef.update({ status: 'EXPIRED' });
            return;
        }

        // Generate JWT auth token for the verified user
        const jwtSecret = process.env.JWT_SECRET || 'default-insecure-secret-change-me';
        const authToken = jwt.sign(
            {
                phone: userPhone,
                verifiedVia: 'whatsapp',
                iat: Math.floor(Date.now() / 1000)
            },
            jwtSecret,
            { expiresIn: '7d' }
        );

        // Update session as VERIFIED
        await sessionRef.update({
            status: 'VERIFIED',
            phone: userPhone,
            verifiedAt: Date.now(),
            authToken
        });

        console.log(`webhook: session ${sessionToken} verified for ${userPhone}`);
    } catch (err) {
        console.error('webhook: Firestore error:', err);
    }
}

/**
 * @typedef {Object} MetaWebhookEntry
 * @property {string} id - WhatsApp Business Account ID
 * @property {MetaWebhookChange[]} changes - Array of changes
 */

/**
 * @typedef {Object} MetaWebhookPayload

// ═══════════════════════════════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
    if (req.method === 'GET') {
        return handleHandshake(req, res);
    }

    if (req.method === 'POST') {
        // Respond 200 immediately to satisfy Meta's retry logic
        res.status(200).json({ ok: true, received: true });

        // Process the message asynchronously after responding
        await processIncomingMessage(req.body);
        return;
    }

    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
}

 * @property {string} object - Always "whatsapp_business_account"
 * @property {MetaWebhookEntry[]} entries - Array of entries
 */

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes
