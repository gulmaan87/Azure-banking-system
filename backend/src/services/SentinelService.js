

















import { LogsIngestionClient } from '@azure/monitor-ingestion';
import { DefaultAzureCredential } from '@azure/identity';

const DCE_ENDPOINT    = process.env.LOG_INGESTION_ENDPOINT; 
const DCR_IMMUTABLE_ID = process.env.LOG_DCR_IMMUTABLE_ID;  
const STREAM_NAME     = 'Custom-BankingAuditLogs_CL';

let client = null;
let buffer = [];         
const BATCH_SIZE   = 25; 
const FLUSH_INTERVAL_MS = 10_000; 

export const initSentinel = () => {
  if (!DCE_ENDPOINT || !DCR_IMMUTABLE_ID) {
    console.log('ℹ️  Sentinel: LOG_INGESTION_ENDPOINT not set — audit logs → console only (dev mode)');
    return;
  }

  try {
    client = new LogsIngestionClient(DCE_ENDPOINT, new DefaultAzureCredential());
    console.log('✅ Sentinel log ingestion client ready');

    
    setInterval(flushBuffer, FLUSH_INTERVAL_MS);
  } catch (err) {
    console.error('❌ Sentinel init failed:', err.message);
  }
};




const flushBuffer = async () => {
  if (!client || buffer.length === 0) return;

  const batch = buffer.splice(0, buffer.length);
  try {
    await client.upload(DCR_IMMUTABLE_ID, STREAM_NAME, batch);
    console.log(`[Sentinel] Flushed ${batch.length} event(s) to Log Analytics`);
  } catch (err) {
    console.error('[Sentinel] Upload failed:', err.message);
    
    buffer.unshift(...batch);
  }
};







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

  
  console.log(`[AUDIT] ${action} | ${entityType}:${entityId} | by:${performedBy}`);

  if (!client) return; 

  buffer.push(event);

  
  if (buffer.length >= BATCH_SIZE) {
    await flushBuffer();
  }
};


process.on('SIGTERM', async () => {
  console.log('[Sentinel] SIGTERM received — flushing audit log buffer...');
  await flushBuffer();
});

process.on('SIGINT', async () => {
  console.log('[Sentinel] SIGINT received — flushing audit log buffer...');
  await flushBuffer();
  process.exit(0);
});
