/**
 * auditLogger.js
 *
 * Dual-destination audit logging:
 *   1. SQL table (audit_log) — queryable by the admin portal
 *   2. Azure Monitor → Log Analytics → Sentinel — triggers security incidents
 *
 * Both destinations are fire-and-forget: failures are logged but never
 * propagate to crash the API request.
 */

import { query } from '../db/connection.js';
import { logToSentinel } from '../services/SentinelService.js';

/**
 * log(action, entityType, entityId, performedBy, details, req)
 *
 * @param {string} action        — e.g. 'CREATE_CUSTOMER', 'AML_FLAG', 'FREEZE_ACCOUNT'
 * @param {string} entityType    — e.g. 'customer', 'transaction', 'aml_flag'
 * @param {string} entityId      — the DB record ID being acted on
 * @param {string} performedBy   — employee UPN / 'aml-engine' / 'system'
 * @param {object} details       — extra fields included in Sentinel KQL queries
 * @param {object} req           — Express request object (for IP extraction)
 */
export const log = async (action, entityType, entityId, performedBy, details = {}, req = null) => {
  const ip = req?.ip || req?.headers?.['x-forwarded-for'] || details.ip || null;

  // ── 1. SQL audit_log table ─────────────────────────────────────────────────
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
    // Never crash the API for an audit failure
    console.error('[AuditLog] SQL write failed:', err.message);
  }

  // ── 2. Azure Monitor → Log Analytics → Sentinel ───────────────────────────
  // Async — does not block the response
  logToSentinel(action, entityType, entityId, performedBy, req, details).catch(err =>
    console.error('[AuditLog] Sentinel write failed:', err.message)
  );
};
