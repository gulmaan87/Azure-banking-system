import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole, requireSelfOrStaff } from '../middleware/rbac.js';
import { query } from '../db/connection.js';

const router = Router();
router.use(authMiddleware);

// GET /api/accounts/customer/:customerId — Customer self or All staff roles
router.get('/customer/:customerId', requireSelfOrStaff(['ADMIN','AUDITOR','DEVELOPER','DATA']), async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM accounts WHERE customer_id = @id ORDER BY opened_at ASC',
      { id: req.params.customerId }
    );
    res.json({ data: result.recordset });
  } catch (err) { next(err); }
});

// POST /api/accounts — Admin only (open additional account for customer)
router.post('/', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { customer_id, account_type, currency } = req.body;
    const accId = `ACC-${Math.floor(10000 + Math.random() * 90000)}`;
    await query(
      `INSERT INTO accounts (id, customer_id, account_type, balance, currency)
       VALUES (@id, @cid, @type, 0.00, @currency)`,
      { id: accId, cid: customer_id, type: account_type || 'Savings', currency: currency || 'USD' }
    );
    res.status(201).json({ message: 'Account opened', data: { id: accId } });
  } catch (err) { next(err); }
});

export default router;
