/**
 * TransactionService.js — Transaction processing + analytics queries
 *
 * New in Phase 8:
 *   - Daily volume stats for chart
 *   - Global recent feed with AML flag join
 *   - Pagination + multi-field search
 *   - Risk-scored summaries per customer
 *   - Transfer limits: single > $10k warns, daily > $50k blocks
 */

import { query } from '../db/connection.js';
import * as auditLogger from '../middleware/auditLogger.js';
import * as AmlService  from './AmlService.js';
import { broadcast }   from './signalr.js';
import { v4 as uuidv4 } from 'uuid';
import { z }           from 'zod';

// ── Transfer limits ──────────────────────────────────────────────────────────
const SINGLE_TX_WARN_THRESHOLD  = 10_000;  // flag for AML if single tx > $10k
const DAILY_TX_HARD_LIMIT       = 50_000;  // hard block if daily total > $50k

const TransactionSchema = z.object({
  account_id:   z.string(),
  customer_id:  z.string(),
  type:         z.enum(['Credit','Debit','Transfer','Withdrawal','Deposit']),
  amount:       z.number().positive().max(100_000, 'Single transaction cannot exceed $100,000'),
  description:  z.string().max(500).optional(),
  counterparty: z.string().max(255).optional(),
  reference:    z.string().max(100).optional(),
  country:      z.string().length(2).optional(),  // ISO-3166 country code
  ip_address:   z.string().optional(),
});

// ── Create Transaction ───────────────────────────────────────────────────────
export const create = async (data, performedBy, req = null) => {
  const validated = TransactionSchema.parse(data);

  // 1. Account guard
  const account = await query(
    'SELECT balance, is_frozen, customer_id FROM accounts WHERE id = @id',
    { id: validated.account_id }
  );
  if (!account.recordset.length) throw Object.assign(new Error('Account not found'), { status: 404 });
  const acc = account.recordset[0];
  if (acc.is_frozen) throw Object.assign(new Error('Account is frozen — transactions blocked'), { status: 403 });

  // 2. Balance check for debits
  if (['Debit','Withdrawal','Transfer'].includes(validated.type)) {
    if (parseFloat(acc.balance) < validated.amount) {
      throw Object.assign(new Error(`Insufficient balance. Available: $${parseFloat(acc.balance).toFixed(2)}`), { status: 422 });
    }
  }

  // 3. Daily transfer limit check (debits only)
  if (['Debit','Withdrawal','Transfer'].includes(validated.type)) {
    const today = await query(
      `SELECT ISNULL(SUM(amount), 0) AS daily_total
       FROM transactions
       WHERE account_id = @id
         AND type IN ('Debit','Withdrawal','Transfer')
         AND CAST(created_at AS DATE) = CAST(GETUTCDATE() AS DATE)`,
      { id: validated.account_id }
    );
    const dailyTotal = parseFloat(today.recordset[0].daily_total);
    if (dailyTotal + validated.amount > DAILY_TX_HARD_LIMIT) {
      throw Object.assign(
        new Error(`Daily transfer limit exceeded. Used: $${dailyTotal.toFixed(2)} / $${DAILY_TX_HARD_LIMIT.toLocaleString()}`),
        { status: 422 }
      );
    }
  }

  // 4. Update balance(s) and insert transaction(s)
  const txId = uuidv4();
  let newBalance = parseFloat(acc.balance);
  let destAcc = null;
  let destNewBalance = 0;

  if (validated.type === 'Transfer' && validated.counterparty) {
    const destAccountResult = await query(
      'SELECT balance, is_frozen, customer_id FROM accounts WHERE id = @id',
      { id: validated.counterparty }
    );
    if (destAccountResult.recordset.length > 0) {
      destAcc = destAccountResult.recordset[0];
      if (destAcc.is_frozen) {
        throw Object.assign(new Error('Destination account is frozen — transfer blocked'), { status: 403 });
      }
      destNewBalance = parseFloat(destAcc.balance) + validated.amount;
    }
  }

  if (['Credit', 'Deposit'].includes(validated.type)) {
    newBalance += validated.amount;
  } else {
    newBalance -= validated.amount;
  }

  // Update source balance
  await query('UPDATE accounts SET balance = @balance WHERE id = @id', { balance: newBalance, id: validated.account_id });

  // Insert source transaction
  await query(
    `INSERT INTO transactions (id, account_id, type, amount, balance_after, description, counterparty, reference, country, ip_address, created_by_emp)
     VALUES (@id, @account_id, @type, @amount, @balance_after, @description, @counterparty, @reference, @country, @ip, @emp)`,
    {
      id: txId, account_id: validated.account_id, type: validated.type,
      amount: validated.amount, balance_after: newBalance,
      description: validated.description || null,
      counterparty: validated.counterparty || null,
      reference: validated.reference || null,
      country: validated.country || null,
      ip: validated.ip_address || req?.ip || null,
      emp: performedBy,
    }
  );

  // If internal destination exists, update destination balance and insert destination transaction
  if (destAcc) {
    await query('UPDATE accounts SET balance = @balance WHERE id = @id', { balance: destNewBalance, id: validated.counterparty });
    
    const destTxId = uuidv4();
    await query(
      `INSERT INTO transactions (id, account_id, type, amount, balance_after, description, counterparty, reference, country, ip_address, created_by_emp)
       VALUES (@id, @account_id, @type, @amount, @balance_after, @description, @counterparty, @reference, @country, @ip, @emp)`,
      {
        id: destTxId, account_id: validated.counterparty, type: validated.type,
        amount: validated.amount, balance_after: destNewBalance,
        description: `Transfer from ${validated.account_id}${validated.description ? ': ' + validated.description : ''}`,
        counterparty: validated.account_id,
        reference: validated.reference || null,
        country: validated.country || null,
        ip: validated.ip_address || req?.ip || null,
        emp: performedBy,
      }
    );

    // Broadcast destination transaction
    await broadcast('TransactionCreated', {
      transaction_id: destTxId, account_id: validated.counterparty,
      customer_id: destAcc.customer_id, type: validated.type,
      amount: validated.amount, balance_after: destNewBalance,
      high_value: validated.amount >= SINGLE_TX_WARN_THRESHOLD,
      timestamp: new Date().toISOString(),
    });
  }

  // 6. Audit + SignalR for source
  await auditLogger.log('CREATE_TRANSACTION', 'transaction', txId, performedBy,
    { amount: validated.amount, type: validated.type, account: validated.account_id }, req);

  await broadcast('TransactionCreated', {
    transaction_id: txId, account_id: validated.account_id,
    customer_id: validated.customer_id, type: validated.type,
    amount: validated.amount, balance_after: newBalance,
    high_value: validated.amount >= SINGLE_TX_WARN_THRESHOLD,
    timestamp: new Date().toISOString(),
  });

  // 7. AML analysis (async, never blocks response)
  AmlService.analyzeTransaction({ ...validated, id: txId }).catch(console.error);

  return { id: txId, balance_after: newBalance, daily_limit_remaining: DAILY_TX_HARD_LIMIT };
};

// ── Per-account history ──────────────────────────────────────────────────────
export const getByAccount = async (accountId, limit = 50, offset = 0) => {
  const result = await query(
    `SELECT t.*, af.flag_type, af.risk_level AS aml_risk
     FROM transactions t
     LEFT JOIN aml_flags af ON af.transaction_id = t.id AND af.resolved_at IS NULL
     WHERE t.account_id = @accountId
     ORDER BY t.created_at DESC
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    { accountId, limit, offset }
  );
  return result.recordset;
};

// ── Per-customer history (all accounts) ─────────────────────────────────────
export const getByCustomer = async (customerId, limit = 50, offset = 0) => {
  const result = await query(
    `SELECT t.*, a.account_type, af.flag_type, af.risk_level AS aml_risk
     FROM transactions t
     JOIN accounts a ON a.id = t.account_id
     LEFT JOIN aml_flags af ON af.transaction_id = t.id AND af.resolved_at IS NULL
     WHERE a.customer_id = @customerId
     ORDER BY t.created_at DESC
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    { customerId, limit, offset }
  );
  return result.recordset;
};

// ── Global recent feed (admin dashboard) ────────────────────────────────────
export const getRecent = async (limit = 100, offset = 0, filters = {}) => {
  const { type, minAmount, maxAmount, search, flagged } = filters;

  let where = 'WHERE 1=1';
  const params = { limit, offset };

  if (type)      { where += ' AND t.type = @type';              params.type = type; }
  if (minAmount) { where += ' AND t.amount >= @minAmount';      params.minAmount = parseFloat(minAmount); }
  if (maxAmount) { where += ' AND t.amount <= @maxAmount';      params.maxAmount = parseFloat(maxAmount); }
  if (flagged === 'true') { where += ' AND af.id IS NOT NULL'; }
  if (search) {
    where += ` AND (t.id LIKE @search OR t.account_id LIKE @search
                    OR t.counterparty LIKE @search OR t.reference LIKE @search
                    OR c.full_name LIKE @search)`;
    params.search = `%${search}%`;
  }

  const result = await query(
    `SELECT t.id, t.account_id, t.type, t.amount, t.balance_after,
            t.description, t.counterparty, t.reference, t.country,
            t.created_at, t.created_by_emp,
            a.customer_id, a.account_type,
            c.full_name AS customer_name, c.risk_level AS customer_risk,
            af.flag_type, af.risk_level AS aml_risk,
            af.id AS flag_id
     FROM transactions t
     JOIN accounts a ON a.id = t.account_id
     JOIN customers c ON c.id = a.customer_id
     LEFT JOIN aml_flags af ON af.transaction_id = t.id AND af.resolved_at IS NULL
     ${where}
     ORDER BY t.created_at DESC
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    params
  );

  const total = await query(
    `SELECT COUNT(*) AS total
     FROM transactions t
     JOIN accounts a ON a.id = t.account_id
     JOIN customers c ON c.id = a.customer_id
     LEFT JOIN aml_flags af ON af.transaction_id = t.id AND af.resolved_at IS NULL
     ${where}`,
    params
  );

  return { data: result.recordset, total: total.recordset[0].total };
};

// ── Stats for dashboard charts ───────────────────────────────────────────────
export const getStats = async () => {
  // Daily volume for last 30 days
  const daily = await query(`
    SELECT CAST(created_at AS DATE) AS date,
           SUM(amount)              AS total_volume,
           COUNT(*)                 AS tx_count,
           SUM(CASE WHEN type IN ('Credit','Deposit') THEN amount ELSE 0 END) AS credits,
           SUM(CASE WHEN type IN ('Debit','Withdrawal','Transfer') THEN amount ELSE 0 END) AS debits
    FROM transactions
    WHERE created_at >= DATEADD(DAY, -30, GETUTCDATE())
    GROUP BY CAST(created_at AS DATE)
    ORDER BY date ASC
  `);

  // By type breakdown
  const byType = await query(`
    SELECT type, COUNT(*) AS count, SUM(amount) AS volume
    FROM transactions
    WHERE created_at >= DATEADD(DAY, -7, GETUTCDATE())
    GROUP BY type
  `);

  // Today's summary
  const today = await query(`
    SELECT COUNT(*)             AS tx_count,
           ISNULL(SUM(amount),0) AS volume,
           COUNT(DISTINCT account_id) AS accounts_active,
           MAX(amount)          AS largest_tx
    FROM transactions
    WHERE CAST(created_at AS DATE) = CAST(GETUTCDATE() AS DATE)
  `);

  // AML flagged this week
  const flaggedCount = await query(`
    SELECT COUNT(*) AS flagged
    FROM aml_flags
    WHERE created_at >= DATEADD(DAY, -7, GETUTCDATE())
      AND resolved_at IS NULL
  `);

  // High-value transactions (> $10k) today
  const highValue = await query(`
    SELECT COUNT(*) AS high_value_count, ISNULL(SUM(amount),0) AS high_value_volume
    FROM transactions
    WHERE amount >= ${SINGLE_TX_WARN_THRESHOLD}
      AND CAST(created_at AS DATE) = CAST(GETUTCDATE() AS DATE)
  `);

  return {
    daily:         daily.recordset,
    byType:        byType.recordset,
    today:         today.recordset[0],
    flaggedCount:  flaggedCount.recordset[0].flagged,
    highValue:     highValue.recordset[0],
    limits: {
      singleWarnThreshold: SINGLE_TX_WARN_THRESHOLD,
      dailyHardLimit:      DAILY_TX_HARD_LIMIT,
    },
  };
};
