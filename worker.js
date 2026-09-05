import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import fetch from 'node-fetch';
import P from 'pino';
import fs from 'fs';

// Configuration
const VERCEL_WEBHOOK_URL = 'https://rudrabalaga.vercel.app/api/webhook';
const AUTH_DIR = './auth_info';
const VERIFY_PREFIX = 'VERIFY_';

// Ensure auth directory exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

// Suppress Baileys internal logs
const logger = P({ level: 'silent' });

// Logging Utility
function log(level, message) {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '\x1b[36m[INFO]\x1b[0m',
    warn: '\x1b[33m[WARN]\x1b[0m',
    error: '\x1b[31m[ERROR]\x1b[0m',
    success: '\x1b[32m[OK]\x1b[0m',
    verify: '\x1b[35m[VERIFY]\x1b[0m',
  };
  console.log(timestamp + ' ' + (prefix[level] || '[LOG]') + ' ' + message);
}

// Vercel Forwarder
async function forwardToVercel(senderPhone, verifyToken) {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: senderPhone,
            text: { body: verifyToken },
            type: 'text'
          }]
        }
      }]
    }]
  };

  try {
    log('info', 'Forwarding verification to Vercel: ' + VERCEL_WEBHOOK_URL);
    const response = await fetch(VERCEL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      log('success', 'Vercel responded with status ' + response.status + ' (' + response.statusText + ')');
    } else {
      const errorBody = await response.text();
      log('error', 'Vercel responded with status ' + response.status + ' - Body: ' + errorBody);
    }
    return response.status;
  } catch (err) {
    log('error', 'Failed to forward to Vercel: ' + err.message);
    return null;
  }
}

// Message Processor
function extractMessageText(message) {
  if (message && message.message && message.message.conversation) {
    return message.message.conversation;
  }
  if (message && message.message && message.message.extendedTextMessage && message.message.extendedTextMessage.text) {
    return message.message.extendedTextMessage.text;
  }
  return null;
}

async function processMessage(msg) {
  // Skip messages sent by ourselves
  if (msg.key.fromMe) return;

  const remoteJid = msg.key.remoteJid;
  if (!remoteJid || remoteJid.endsWith('@g.us')) return;

  // Extract sender phone number
  const senderPhone = remoteJid.replace('@s.whatsapp.net', '');

  // Extract message text
  const text = extractMessageText(msg);
  if (!text || typeof text !== 'string') return;

  const trimmedText = text.trim();
  log('info', 'Message from ' + senderPhone + ': "' + trimmedText + '"');

  // Check if it is a verification token
  if (trimmedText.startsWith(VERIFY_PREFIX)) {
    log('verify', 'Token: ' + trimmedText + ' | From: ' + senderPhone);
    await forwardToVercel(senderPhone, trimmedText);
  }
}

// WhatsApp Connection
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    logger,
    browser: ['Rudra Balaga Worker', 'Chrome', '120.0'],
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    markOnlineOnConnect: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (upsert) => {
    try {
      const messages = upsert.messages || [];
      for (const msg of messages) {
        if (msg && msg.message) {
          await processMessage(msg);
        }
      }
    } catch (err) {
      log('error', 'Error processing message batch: ' + err.message);
    }
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      log('info', 'Scan the QR code below with WhatsApp:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'connecting') {
      log('info', 'Connecting to WhatsApp Web...');
    }

    if (connection === 'open') {
      log('success', 'Connected to WhatsApp Web! Worker is now listening for messages.');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output ? lastDisconnect.error.output.statusCode : null;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        log('warn', 'Connection closed (code: ' + statusCode + '). Reconnecting in 5s...');
        log('warn', 'Reason: ' + (lastDisconnect && lastDisconnect.error ? lastDisconnect.error.message : 'Unknown'));
        setTimeout(() => connectToWhatsApp(), 5000);
      } else {
        log('error', 'Logged out from WhatsApp. Delete auth_info/ and restart to re-scan QR.');
        process.exit(0);
      }
    }
  });

  return sock;
}

// Graceful Shutdown
function setupGracefulShutdown(sock) {
  const shutdown = async (signal) => {
    log('warn', 'Received ' + signal + '. Shutting down gracefully...');
    try {
      if (sock) {
        await sock.end(undefined);
      }
    } catch (err) {
      log('error', 'Error during shutdown: ' + err.message);
    }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Main Entry Point
async function main() {
  log('info', '==================================================');
  log('info', '  Rudra Balaga - WhatsApp Web Worker');
  log('info', '  Listening for VERIFY_XXXXXX messages...');
  log('info', '==================================================');

  const sock = await connectToWhatsApp();
  setupGracefulShutdown(sock);
}

main().catch((err) => {
  log('error', 'Fatal error in main: ' + err.message);
  process.exit(1);
});
