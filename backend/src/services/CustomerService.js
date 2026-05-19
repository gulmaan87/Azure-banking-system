import { query } from '../db/connection.js';
import * as auditLogger from '../middleware/auditLogger.js';
import { broadcast } from './signalr.js';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// ── Validation schema ─────────────────────────────────────────────────────
const CustomerSchema = z.object({
  full_name:     z.string().min(2).max(100),
  email:         z.string().email(),
  phone:         z.string().optional(),
  address:       z.string().optional(),
  date_of_birth: z.string().optional(),
  nationality:   z.string().optional(),
  risk_level:    z.enum(['Low','Medium','High','Critical']).default('Low'),
});

// Custom error classes
class ConflictError    extends Error { constructor(msg) { super(msg); this.status = 409; } }
class NotFoundError    extends Error { constructor(msg) { super(msg); this.status = 404; } }
class BusinessRuleError extends Error { constructor(msg) { super(msg); this.status = 422; } }
class ForbiddenError   extends Error { constructor(msg) { super(msg); this.status = 403; } }

// ── CustomerService ───────────────────────────────────────────────────────
export const getAll = async () => {
  const result = await query(`
    SELECT c.*, 
           COUNT(a.id) AS account_count,
           SUM(a.balance) AS total_balance
    FROM customers c
    LEFT JOIN accounts a ON a.customer_id = c.id
    GROUP BY c.id, c.full_name, c.email, c.phone, c.address,
             c.date_of_birth, c.nationality, c.status, c.risk_level,
             c.kyc_verified, c.created_at, c.updated_at
    ORDER BY c.created_at DESC
  `);
  return result.recordset;
};

export const getById = async (id) => {
  const result = await query('SELECT * FROM customers WHERE id = @id', { id });
  if (!result.recordset.length) throw new NotFoundError(`Customer ${id} not found`);
  return result.recordset[0];
};

export const create = async (data, performedBy, req = null) => {
  const validated = CustomerSchema.parse(data);

  // Duplicate email check
  const exists = await query('SELECT id FROM customers WHERE email = @email', { email: validated.email });
  if (exists.recordset.length) throw new ConflictError('Email already registered');

  const id = `CUS-${Math.floor(1000 + Math.random() * 9000)}`;

  await query(
    `INSERT INTO customers (id, full_name, email, phone, address, date_of_birth, nationality, risk_level, status)
     VALUES (@id, @full_name, @email, @phone, @address, @date_of_birth, @nationality, @risk_level, 'Review KYC')`,
    { id, ...validated }
  );

  // Create default Savings account at $0
  const accId = `ACC-${Math.floor(10000 + Math.random() * 90000)}`;
  await query(
    `INSERT INTO accounts (id, customer_id, account_type, balance) VALUES (@accId, @customerId, 'Savings', 0.00)`,
    { accId, customerId: id }
  );

  await auditLogger.log('CREATE_CUSTOMER', 'customer', id, performedBy, { email: validated.email }, req);
  await broadcast('CustomerUpdated', { action: 'CREATED', customer_id: id, email: validated.email, timestamp: new Date().toISOString() });
  return { id, status: 'Review KYC', account_id: accId };
};

export const update = async (id, data, role, performedBy, req = null) => {
  const customer = await getById(id);

  if (role === 'AUDITOR') {
    // Auditors can ONLY update risk_level
    if (!data.risk_level) throw new BusinessRuleError('Auditors can only update risk_level');
    await query('UPDATE customers SET risk_level = @risk, updated_at = GETUTCDATE() WHERE id = @id',
      { risk: data.risk_level, id });
    await auditLogger.log('UPDATE_RISK_LEVEL', 'customer', id, performedBy, { risk_level: data.risk_level }, req);
  } else {
    // Admins can update all fields
    const validated = CustomerSchema.partial().parse(data);
    await query(
      `UPDATE customers 
       SET full_name = COALESCE(@full_name, full_name),
           email     = COALESCE(@email, email),
           phone     = COALESCE(@phone, phone),
           address   = COALESCE(@address, address),
           risk_level= COALESCE(@risk_level, risk_level),
           updated_at = GETUTCDATE()
       WHERE id = @id`,
      { ...validated, id }
    );
    await auditLogger.log('UPDATE_CUSTOMER', 'customer', id, performedBy, { changes: validated }, req);
  }

  const updated = await getById(id);
  await broadcast('CustomerUpdated', { action: 'UPDATED', customer_id: id, changes: data, timestamp: new Date().toISOString() });
  return updated;
};

export const remove = async (id, performedBy, req = null) => {
  const accounts = await query('SELECT balance FROM accounts WHERE customer_id = @id', { id });
  const hasBalance = accounts.recordset.some(a => parseFloat(a.balance) > 0);
  if (hasBalance) {
    throw new BusinessRuleError('Cannot delete customer with non-zero balance. Transfer or withdraw funds first.');
  }
  await query('DELETE FROM customers WHERE id = @id', { id });
  await auditLogger.log('DELETE_CUSTOMER', 'customer', id, performedBy, {}, req);
  await broadcast('CustomerUpdated', { action: 'DELETED', customer_id: id, timestamp: new Date().toISOString() });
};

export const freeze = async (id, reason, performedBy, req = null) => {
  const customer = await getById(id);
  if (!['Active', 'Flagged'].includes(customer.status)) {
    throw new BusinessRuleError(`Cannot freeze account with status: ${customer.status}`);
  }
  await query('UPDATE customers SET status = @status, updated_at = GETUTCDATE() WHERE id = @id',
    { status: 'Frozen', id });
  await query('UPDATE accounts SET is_frozen = 1 WHERE customer_id = @id', { id });
  await auditLogger.log('FREEZE_ACCOUNT', 'customer', id, performedBy, { reason }, req);
  await broadcast('CustomerUpdated', { action: 'FROZEN', customer_id: id, reason, timestamp: new Date().toISOString() });
};

export const unfreeze = async (id, performedBy, req = null) => {
  await query('UPDATE customers SET status = @status, updated_at = GETUTCDATE() WHERE id = @id',
    { status: 'Active', id });
  await query('UPDATE accounts SET is_frozen = 0 WHERE customer_id = @id', { id });
  await auditLogger.log('UNFREEZE_ACCOUNT', 'customer', id, performedBy, {}, req);
  await broadcast('CustomerUpdated', { action: 'UNFROZEN', customer_id: id, timestamp: new Date().toISOString() });
};

export const flag = async (id, reason, performedBy, req = null) => {
  const customer = await getById(id);
  if (customer.status !== 'Active') {
    throw new BusinessRuleError(`Can only flag Active accounts. Current status: ${customer.status}`);
  }
  await query('UPDATE customers SET status = @status, updated_at = GETUTCDATE() WHERE id = @id',
    { status: 'Flagged', id });
  await auditLogger.log('FLAG_CUSTOMER', 'customer', id, performedBy, { reason }, req);
  await broadcast('CustomerUpdated', { action: 'FLAGGED', customer_id: id, reason, timestamp: new Date().toISOString() });
};
