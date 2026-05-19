/**
 * transactions.js — Transaction API routes
 *
 * GET  /api/transactions              — global feed, paginated, filterable
 * GET  /api/transactions/stats        — chart data + today's summary
 * GET  /api/transactions/customer/:id — per-customer history
 * GET  /api/transactions/account/:id  — per-account history
 * POST /api/transactions              — create transaction (Admin only)
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole }   from '../middleware/rbac.js';
import * as TransactionService from '../services/TransactionService.js';

const router = Router();
router.use(authMiddleware);

// ── Stats for dashboard charts ────────────────────────────────────────────────
// Must be defined BEFORE /:id routes to avoid route collision
router.get('/stats', requireRole(['ADMIN','AUDITOR']), async (req, res, next) => {
  try {
    const data = await TransactionService.getStats();
    res.json({ data });
  } catch (err) { next(err); }
});

// ── Global transaction feed ───────────────────────────────────────────────────
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

// ── Per-customer history ──────────────────────────────────────────────────────
router.get('/customer/:customerId', requireRole(['ADMIN','AUDITOR']), async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0,  0);
    const data   = await TransactionService.getByCustomer(req.params.customerId, limit, offset);
    res.json({ data, count: data.length });
  } catch (err) { next(err); }
});

// ── Per-account history ───────────────────────────────────────────────────────
router.get('/account/:accountId', requireRole(['ADMIN','AUDITOR']), async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0,  0);
    const data   = await TransactionService.getByAccount(req.params.accountId, limit, offset);
    res.json({ data, count: data.length });
  } catch (err) { next(err); }
});

// ── Create transaction (Admin only) ──────────────────────────────────────────
router.post('/', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    const result = await TransactionService.create(
      { ...req.body, ip_address: req.ip },
      performedBy,
      req
    );
    res.status(201).json({ message: 'Transaction processed', data: result });
  } catch (err) { next(err); }
});

export default router;
