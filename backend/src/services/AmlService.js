import { query } from '../db/connection.js';
import * as auditLogger from '../middleware/auditLogger.js';
import { broadcast } from './signalr.js';

/**
 * AmlService — Anti-Money Laundering Rules Engine
 * Runs automatically on every new transaction.
 */

export const analyzeTransaction = async (transaction) => {
  const { id: txId, account_id, customer_id, amount, country } = transaction;
  const flags = [];

  // ── Rule 1: Large Cash Transaction (> $10,000) ────────────────────────
  if (amount > 10000) {
    flags.push({
      rule: 'LARGE_CASH',
      severity: 'High',
      description: `Transaction of $${amount.toFixed(2)} exceeds $10,000 regulatory threshold`,
    });
  }

  // ── Rule 2: Structuring (many transactions totaling just under $10k) ──
  const last24h = await query(
    `SELECT SUM(amount) AS total FROM transactions
     WHERE account_id = @accountId AND type IN ('Debit','Withdrawal')
       AND created_at >= DATEADD(HOUR, -24, GETUTCDATE())`,
    { accountId: account_id }
  );
  const daily_total = parseFloat(last24h.recordset[0]?.total || 0);
  if (daily_total > 8000 && daily_total < 10000) {
    flags.push({
      rule: 'STRUCTURING',
      severity: 'Critical',
      description: `Daily outflow of $${daily_total.toFixed(2)} suggests structuring to avoid reporting threshold`,
    });
  }

  // ── Rule 3: High Velocity (> 5 transactions in last hour) ────────────
  const hourly = await query(
    `SELECT COUNT(*) AS cnt FROM transactions
     WHERE account_id = @accountId
       AND created_at >= DATEADD(HOUR, -1, GETUTCDATE())`,
    { accountId: account_id }
  );
  const tx_count = parseInt(hourly.recordset[0]?.cnt || 0);
  if (tx_count > 5) {
    flags.push({
      rule: 'HIGH_VELOCITY',
      severity: 'Medium',
      description: `${tx_count} transactions processed in the last hour`,
    });
  }

  // ── Rule 4: Geographic Anomaly ────────────────────────────────────────
  if (country) {
    const usual = await query(
      `SELECT TOP 1 country FROM transactions
       WHERE account_id = @accountId AND country IS NOT NULL
       ORDER BY created_at DESC OFFSET 1 ROWS`,
      { accountId: account_id }
    );
    const usualCountry = usual.recordset[0]?.country;
    if (usualCountry && country !== usualCountry) {
      flags.push({
        rule: 'GEO_ANOMALY',
        severity: 'Medium',
        description: `Unusual transaction location: ${country} (usual: ${usualCountry})`,
      });
    }
  }

  // ── Persist flags and auto-escalate ──────────────────────────────────
  if (flags.length > 0) {
    for (const flag of flags) {
      await query(
        `INSERT INTO aml_flags (customer_id, transaction_id, rule, severity, description)
         VALUES (@cid, @txId, @rule, @severity, @desc)`,
        { cid: customer_id, txId, rule: flag.rule, severity: flag.severity, desc: flag.description }
      );
    }

    // Auto-flag the customer account if Critical or multiple flags
    const hasCritical = flags.some(f => f.severity === 'Critical');
    if (hasCritical || flags.length >= 2) {
      await query(
        `UPDATE customers SET status = 'Flagged', updated_at = GETUTCDATE()
         WHERE id = @cid AND status = 'Active'`,
        { cid: customer_id }
      );
    }

    await auditLogger.log('AML_FLAG', 'transaction', txId, 'aml-engine',
      { rules: flags.map(f => f.rule) });

    // Broadcast real-time alert to all admin portal clients
    await broadcast('AmlAlert', {
      customer_id,
      transaction_id: txId,
      flags,
      severity: flags.some(f => f.severity === 'Critical') ? 'Critical'
               : flags.some(f => f.severity === 'High') ? 'High' : 'Medium',
      timestamp: new Date().toISOString(),
    });
  }

  return flags;
};

export const getActiveFlags = async (customerId) => {
  const result = await query(
    `SELECT * FROM aml_flags WHERE customer_id = @id AND resolved = 0 ORDER BY created_at DESC`,
    { id: customerId }
  );
  return result.recordset;
};

export const resolveFlag = async (flagId, resolvedBy, note) => {
  await query(
    `UPDATE aml_flags SET resolved = 1, resolved_by = @by, resolved_at = GETUTCDATE()
     WHERE id = @id`,
    { id: flagId, by: resolvedBy }
  );
  await auditLogger.log('AML_RESOLVE', 'aml_flag', flagId, resolvedBy, { note });
};
