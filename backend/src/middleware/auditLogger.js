










import { query } from '../db/connection.js';
import { logToSentinel } from '../services/SentinelService.js';











export const log = async (action, entityType, entityId, performedBy, details = {}, req = null) => {
  const ip = req?.ip || req?.headers?.['x-forwarded-for'] || details.ip || null;

  
  try {
    await query(
      `INSERT INTO audit_log (action, entity_type, entity_id, performed_by, ip_address, details_json)
       VALUES (@action, @entityType, @entityId, @performedBy, @ip, @details)`,
      {
        action,
        entityType,
        entityId,
        performedBy: performedBy || 'system',
        ip,
        details: JSON.stringify(details),
      }
    );
  } catch (err) {
    
    console.error('[AuditLog] SQL write failed:', err.message);
  }

  
  
  logToSentinel(action, entityType, entityId, performedBy, req, details).catch(err =>
    console.error('[AuditLog] Sentinel write failed:', err.message)
  );
};
