import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole, requireSelfOrStaff } from '../middleware/rbac.js';
import * as CustomerService from '../services/CustomerService.js';

const router = Router();
router.use(authMiddleware);

// GET /api/customers — All staff roles
router.get('/', requireRole(['ADMIN','AUDITOR','DEVELOPER','DATA']), async (req, res, next) => {
  try {
    const customers = await CustomerService.getAll();
    res.json({ data: customers, count: customers.length });
  } catch (err) { next(err); }
});

// GET /api/customers/:id — Customer self or All staff roles
router.get('/:id', requireSelfOrStaff(['ADMIN','AUDITOR','DEVELOPER','DATA']), async (req, res, next) => {
  try {
    const customer = await CustomerService.getById(req.params.id);
    res.json({ data: customer });
  } catch (err) { next(err); }
});

// POST /api/customers — Admin only
router.post('/', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    const result = await CustomerService.create(req.body, performedBy, req);  // pass req for IP
    res.status(201).json({ message: 'Customer created', data: result });
  } catch (err) { next(err); }
});

// PUT /api/customers/:id — Admin full update; Auditor risk_level only
router.put('/:id', requireRole(['ADMIN','AUDITOR']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    const updated = await CustomerService.update(req.params.id, req.body, req.role, performedBy, req);
    res.json({ message: 'Customer updated', data: updated });
  } catch (err) { next(err); }
});

// DELETE /api/customers/:id — Admin only (requires zero balance)
router.delete('/:id', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    await CustomerService.remove(req.params.id, performedBy, req);
    res.json({ message: 'Customer deleted' });
  } catch (err) { next(err); }
});

// PATCH /api/customers/:id/freeze — Admin only
router.patch('/:id/freeze', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    await CustomerService.freeze(req.params.id, req.body.reason, performedBy, req);
    res.json({ message: 'Account frozen' });
  } catch (err) { next(err); }
});

// PATCH /api/customers/:id/unfreeze — Admin only
router.patch('/:id/unfreeze', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    await CustomerService.unfreeze(req.params.id, performedBy, req);
    res.json({ message: 'Account reactivated' });
  } catch (err) { next(err); }
});

// PATCH /api/customers/:id/flag — Admin only
router.patch('/:id/flag', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    await CustomerService.flag(req.params.id, req.body.reason, performedBy, req);
    res.json({ message: 'Account flagged for AML review' });
  } catch (err) { next(err); }
});

export default router;
