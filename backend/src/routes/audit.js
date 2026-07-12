



import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { query } from '../db/connection.js';

const router = Router();
router.use(authMiddleware);



router.get('/', requireRole(['ADMIN', 'AUDITOR']), async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 100, 500);
    const offset = Math.max(parseInt(req.query.offset) || 0,   0);
    const action = req.query.action || null;

    let sql = `
      SELECT id, action, entity_type, entity_id, performed_by,
             ip_address, details_json, created_at
      FROM audit_log
      ${action ? 'WHERE action = @action' : ''}
      ORDER BY created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const result = await query(sql, { limit, offset, ...(action ? { action } : {}) });

    const total = await query(
      `SELECT COUNT(*) AS total FROM audit_log ${action ? 'WHERE action = @action' : ''}`,
      action ? { action } : {}
    );

    res.json({
      data:  result.recordset,
      count: result.recordset.length,
      total: total.recordset[0].total,
      limit,
      offset,
    });
  } catch (err) { next(err); }
});

export default router;
