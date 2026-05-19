/**
 * signalr.js — Azure SignalR broadcaster for the backend
 *
 * Architecture (Serverless mode):
 *   - Frontend clients connect directly to Azure SignalR Service
 *   - Backend calls the REST API to broadcast events — no persistent connection needed
 *   - This is more scalable than the "Default" mode for banking workloads
 *
 * Events emitted:
 *   "AmlAlert"          — triggered when AmlService flags a transaction
 *   "CustomerUpdated"   — triggered when any customer record changes
 *   "TransactionCreated"— triggered when a new transaction is processed
 *   "KycStatusChanged"  — triggered when KYC is approved or rejected
 */

import { RestServiceClient } from '@microsoft/signalr';

let broadcaster = null;

export const initSignalR = () => {
  const connStr = process.env.SIGNALR_CONNECTION_STRING;
  if (!connStr) {
    console.log('ℹ️  SIGNALR_CONNECTION_STRING not set — real-time events disabled (dev mode)');
    return;
  }

  try {
    // RestServiceClient: backend calls SignalR REST API to broadcast
    // No persistent WebSocket from the backend — fully serverless
    broadcaster = new RestServiceClient(connStr);
    console.log('✅ SignalR broadcaster connected');
  } catch (err) {
    console.error('❌ SignalR init failed:', err.message);
  }
};

/**
 * broadcast(event, data)
 * Sends an event to ALL connected admin portal clients.
 * Fails silently if SignalR is not configured (dev mode).
 */
export const broadcast = async (event, data) => {
  if (!broadcaster) return;  // dev mode — no-op

  try {
    await broadcaster.send('adminHub', event, [data]);
  } catch (err) {
    console.error(`[SignalR] Failed to broadcast '${event}':`, err.message);
  }
};

/**
 * broadcastToUser(userId, event, data)
 * Sends a targeted event to a specific employee (by their Azure AD OID).
 */
export const broadcastToUser = async (userId, event, data) => {
  if (!broadcaster) return;

  try {
    await broadcaster.sendToUser(userId, event, [data]);
  } catch (err) {
    console.error(`[SignalR] Failed to send to user '${userId}':`, err.message);
  }
};
