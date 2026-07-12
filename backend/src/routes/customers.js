import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole, requireSelfOrStaff } from '../middleware/rbac.js';
import * as CustomerService from '../services/CustomerService.js';

const router = Router();
router.use(authMiddleware);


router.get('/', requireRole(['ADMIN','AUDITOR','DEVELOPER','DATA']), async (req, res, next) => {
  try {
    const customers = await CustomerService.getAll();
    res.json({ data: customers, count: customers.length });
  } catch (err) { next(err); }
});


router.get('/:id', requireSelfOrStaff(['ADMIN','AUDITOR','DEVELOPER','DATA']), async (req, res, next) => {
  try {
    const customer = await CustomerService.getById(req.params.id);
    res.json({ data: customer });
  } catch (err) { next(err); }
});


router.post('/', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    const result = await CustomerService.create(req.body, performedBy, req);  
    res.status(201).json({ message: 'Customer created', data: result });
  } catch (err) { next(err); }
});


router.put('/:id', requireRole(['ADMIN','AUDITOR']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    const updated = await CustomerService.update(req.params.id, req.body, req.role, performedBy, req);
    res.json({ message: 'Customer updated', data: updated });
  } catch (err) { next(err); }
});


router.delete('/:id', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    await CustomerService.remove(req.params.id, performedBy, req);
    res.json({ message: 'Customer deleted' });
  } catch (err) { next(err); }
});


router.patch('/:id/freeze', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    await CustomerService.freeze(req.params.id, req.body.reason, performedBy, req);
    res.json({ message: 'Account frozen' });
  } catch (err) { next(err); }
});


router.patch('/:id/unfreeze', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    await CustomerService.unfreeze(req.params.id, performedBy, req);
    res.json({ message: 'Account reactivated' });
  } catch (err) { next(err); }
});


router.patch('/:id/flag', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    await CustomerService.flag(req.params.id, req.body.reason, performedBy, req);
    res.json({ message: 'Account flagged for AML review' });
  } catch (err) { next(err); }
});

export default router;
