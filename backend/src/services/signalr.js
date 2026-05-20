/**
 * signalr.js — Azure SignalR Service broadcaster (server-side)
 *
 * Uses the Azure SignalR Service REST API to broadcast events.
 * This is the correct serverless/REST approach for a Node.js backend.
 *
 * Events emitted:
 *   "AmlAlert"           — triggered when AmlService flags a transaction
 *   "CustomerUpdated"    — triggered when any customer record changes
 *   "TransactionCreated" — triggered when a new transaction is processed
 *   "KycStatusChanged"   — triggered when KYC is approved or rejected
 */

import crypto from 'crypto';

let signalrEndpoint = null;
let signalrKey = null;

/**
 * Parse Azure SignalR connection string:
 * Endpoint=https://...;AccessKey=...;Version=1.0;
 */
const parseConnectionString = (connStr) => {
  const parts = {};
  connStr.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx > 0) {
      parts[part.slice(0, idx)] = part.slice(idx + 1);
    }
  });
  return {
    endpoint: parts['Endpoint']?.replace(/\/$/, ''),
    key: parts['AccessKey'],
  };
};

/**
 * Generate a simple JWT access token for the SignalR REST API.
 * Azure SignalR uses HS256 signed JWTs for server-to-service auth.
 */
const generateToken = (endpoint, key) => {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    aud: endpoint,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', key)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
};

export const initSignalR = () => {
  const connStr = process.env.SIGNALR_CONNECTION_STRING;
  if (!connStr) {
    console.log('ℹ️  SIGNALR_CONNECTION_STRING not set — real-time events disabled (dev mode)');
    return;
  }

  try {
    const { endpoint, key } = parseConnectionString(connStr);
    signalrEndpoint = endpoint;
    signalrKey      = key;
    console.log(`✅ SignalR broadcaster ready → ${endpoint}`);
  } catch (err) {
    console.error('❌ SignalR init failed:', err.message);
  }
};

/**
 * broadcast(event, data)
 * Broadcasts an event to ALL connected clients in the "adminHub" hub.
 * Fails silently in dev mode (no connection string).
 */
export const broadcast = async (event, data) => {
  if (!signalrEndpoint || !signalrKey) return;

  const url   = `${signalrEndpoint}/api/v1/hubs/adminHub`;
  const token = generateToken(url, signalrKey);

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ target: event, arguments: [data] }),
    });
    if (!res.ok) {
      console.error(`[SignalR] Broadcast '${event}' failed: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`[SignalR] Broadcast '${event}' error:`, err.message);
  }
};

/**
 * broadcastToUser(userId, event, data)
 * Sends a targeted event to a specific employee by their Azure AD OID.
 */
export const broadcastToUser = async (userId, event, data) => {
  if (!signalrEndpoint || !signalrKey) return;

  const url   = `${signalrEndpoint}/api/v1/hubs/adminHub/users/${encodeURIComponent(userId)}`;
  const token = generateToken(url, signalrKey);

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ target: event, arguments: [data] }),
    });
    if (!res.ok) {
      console.error(`[SignalR] Send to user '${userId}' failed: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`[SignalR] Send to user '${userId}' error:`, err.message);
  }
};
