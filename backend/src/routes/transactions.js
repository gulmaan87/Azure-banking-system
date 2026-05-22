/**
 * transactions.js — Transaction API routes
 *
 * GET  /api/transactions              — global feed, paginated, filterable (staff only)
 * GET  /api/transactions/stats        — chart data + today's summary (staff only)
 * GET  /api/transactions/customer/:customerId — per-customer history (self or staff)
 * GET  /api/transactions/account/:accountId   — per-account history  (self or staff)
 * POST /api/transactions              — create transaction
 *                                       Customers: Transfer only (from owned account)
 *                                       Admin:     Any type
 */

import { Router } from 'express';
import { authMiddleware }         from '../middleware/auth.js';
import { requireRole, requireSelfOrStaff } from '../middleware/rbac.js';
import { query }                  from '../db/connection.js';
import * as TransactionService   from '../services/TransactionService.js';

const router = Router();
router.use(authMiddleware);

// ── Stats for dashboard charts ────────────────────────────────────────────────
router.get('/stats', requireRole(['ADMIN','AUDITOR']), async (req, res, next) => {
  try {
    const data = await TransactionService.getStats();
    res.json({ data });
  } catch (err) { next(err); }
});

// ── Global transaction feed (staff only) ─────────────────────────────────────
router.get('/', requireRole(['ADMIN','AUDITOR']), async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0,  0);

    const { data, total } = await TransactionService.getRecent(limit, offset, {
      type:      req.query.type,
      minAmount: req.query.minAmount,
      maxAmount: req.query.maxAmount,
      search:    req.query.search,
      flagged:   req.query.flagged,
    });

    res.json({ data, total, limit, offset });
  } catch (err) { next(err); }
});

// ── Per-customer history (customer self OR staff) ─────────────────────────────
router.get('/customer/:customerId', requireSelfOrStaff(['ADMIN','AUDITOR']), async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0,  0);
    const data   = await TransactionService.getByCustomer(req.params.customerId, limit, offset);
    res.json({ data, count: data.length });
  } catch (err) { next(err); }
});

// ── Per-account history (customer self-owns OR staff) ─────────────────────────
router.get('/account/:accountId', async (req, res, next) => {
  try {
    // If customer: verify they own this account
    if (req.customer) {
      const ownerCheck = await query(
        'SELECT customer_id FROM accounts WHERE id = @id',
        { id: req.params.accountId }
      );
      if (!ownerCheck.recordset.length) {
        return res.status(404).json({ error: 'Account not found' });
      }
      if (ownerCheck.recordset[0].customer_id !== req.customer.id) {
        return res.status(403).json({ error: 'Access denied: you do not own this account' });
      }
    } else {
      // Employee: require at least AUDITOR
      const userGroups = req.user?.groups || [];
      const staffRoles = ['ADMIN','AUDITOR','DEVELOPER','DATA'];
      const roleMap = {
        [process.env.AZURE_GROUP_BANK_ADMINS]:       'ADMIN',
        [process.env.AZURE_GROUP_SECURITY_AUDITORS]: 'AUDITOR',
        [process.env.AZURE_GROUP_APP_DEVELOPERS]:    'DEVELOPER',
        [process.env.AZURE_GROUP_DATA_ENGINEERS]:    'DATA',
      };
      const role = userGroups.map(g => roleMap[g]).find(r => r);
      if (!role || !staffRoles.includes(role)) {
        return res.status(403).json({ error: 'Access denied: insufficient permissions' });
      }
    }

    const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0,  0);
    const data   = await TransactionService.getByAccount(req.params.accountId, limit, offset);
    res.json({ data, count: data.length });
  } catch (err) { next(err); }
});

// ── Create transaction ────────────────────────────────────────────────────────
// Admin: any type.  Customer: Transfer only from own account.
router.post('/', async (req, res, next) => {
  try {
    const performedBy = req.user?.upn || req.user?.preferred_username || 'customer';

    // Customer self-service: only Transfer type, from owned account
    if (req.customer) {
      const { type, account_id } = req.body;

      if (type !== 'Transfer') {
        return res.status(403).json({ error: 'Customers may only submit Transfer transactions' });
      }

      // Verify account ownership
      const ownerCheck = await query(
        'SELECT customer_id FROM accounts WHERE id = @id',
        { id: account_id }
      );
      if (!ownerCheck.recordset.length) {
        return res.status(404).json({ error: 'Source account not found' });
      }
      if (ownerCheck.recordset[0].customer_id !== req.customer.id) {
        return res.status(403).json({ error: 'Access denied: you do not own the source account' });
      }

      const result = await TransactionService.create(
        { ...req.body, customer_id: req.customer.id, ip_address: req.ip },
        performedBy,
        req
      );
      return res.status(201).json({ message: 'Transfer submitted', data: result });
    }

    // Employee/Admin path — requireRole check
    const userGroups = req.user?.groups || [];
    const adminGroup = process.env.AZURE_GROUP_BANK_ADMINS;
    if (!userGroups.includes(adminGroup)) {
      return res.status(403).json({ error: 'Access denied: requires ADMIN role' });
    }

    const result = await TransactionService.create(
      { ...req.body, ip_address: req.ip },
      performedBy,
      req
    );
    res.status(201).json({ message: 'Transaction processed', data: result });
  } catch (err) { next(err); }
});

export default router;
