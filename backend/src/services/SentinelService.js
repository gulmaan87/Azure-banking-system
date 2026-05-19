/**
 * SentinelService.js — Azure Monitor Log Ingestion client
 *
 * HOW IT WORKS:
 *   - The backend POSTs batches of audit events to the Data Collection Endpoint (DCE)
 *   - Azure routes them into the custom Log Analytics table: BankingAuditLogs_CL
 *   - Sentinel analytics rules then query that table every 5-60 mins
 *   - Rules trigger incidents for: AML patterns, mass deletes, after-hours access,
 *     IP enumeration, failed logins
 *
 * AUTH:
 *   - Uses DefaultAzureCredential (Managed Identity on VM, az login locally)
 *   - No connection string or API key needed
 *
 * DEV MODE:
 *   - LOG_INGESTION_ENDPOINT not set → logs to console only, no Azure calls
 */

import { LogsIngestionClient } from '@azure/monitor-ingestion';
import { DefaultAzureCredential } from '@azure/identity';

const DCE_ENDPOINT    = process.env.LOG_INGESTION_ENDPOINT; // from Key Vault / .env
const DCR_IMMUTABLE_ID = process.env.LOG_DCR_IMMUTABLE_ID;  // from Key Vault / .env
const STREAM_NAME     = 'Custom-BankingAuditLogs_CL';

let client = null;
let buffer = [];         // batch buffer
const BATCH_SIZE   = 25; // send when buffer hits 25 events
const FLUSH_INTERVAL_MS = 10_000; // or every 10 seconds

export const initSentinel = () => {
  if (!DCE_ENDPOINT || !DCR_IMMUTABLE_ID) {
    console.log('ℹ️  Sentinel: LOG_INGESTION_ENDPOINT not set — audit logs → console only (dev mode)');
    return;
  }

  try {
    client = new LogsIngestionClient(DCE_ENDPOINT, new DefaultAzureCredential());
    console.log('✅ Sentinel log ingestion client ready');

    // Flush buffer on an interval even if batch size not reached
    setInterval(flushBuffer, FLUSH_INTERVAL_MS);
  } catch (err) {
    console.error('❌ Sentinel init failed:', err.message);
  }
};

/**
 * Flush buffered events to Azure Monitor
 */
const flushBuffer = async () => {
  if (!client || buffer.length === 0) return;

  const batch = buffer.splice(0, buffer.length);
  try {
    await client.upload(DCR_IMMUTABLE_ID, STREAM_NAME, batch);
    console.log(`[Sentinel] Flushed ${batch.length} event(s) to Log Analytics`);
  } catch (err) {
    console.error('[Sentinel] Upload failed:', err.message);
    // Re-queue events so they're not lost
    buffer.unshift(...batch);
  }
};

/**
 * logToSentinel(action, entityType, entityId, performedBy, req, details)
 *
 * Called from every API route and service mutation.
 * Enriches events with IP, user agent, timestamp.
 */
export const logToSentinel = async (action, entityType, entityId, performedBy, req, details = {}) => {
  const event = {
    TimeGenerated:  new Date().toISOString(),
    timestamp:      new Date().toISOString(),
    action,
    entity_type:    entityType,
    entity_id:      entityId,
    performed_by:   performedBy,
    ip_address:     req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown',
    user_agent:     req?.headers?.['user-agent'] || '',
    details:        JSON.stringify(details),
  };

  // Always log to console (visible in PM2 logs on VM)
  console.log(`[AUDIT] ${action} | ${entityType}:${entityId} | by:${performedBy}`);

  if (!client) return; // dev mode — console only

  buffer.push(event);

  // Flush immediately if batch is full
  if (buffer.length >= BATCH_SIZE) {
    await flushBuffer();
  }
};

// Graceful shutdown — flush remaining events before process exits
process.on('SIGTERM', async () => {
  console.log('[Sentinel] SIGTERM received — flushing audit log buffer...');
  await flushBuffer();
});

process.on('SIGINT', async () => {
  console.log('[Sentinel] SIGINT received — flushing audit log buffer...');
  await flushBuffer();
  process.exit(0);
});
