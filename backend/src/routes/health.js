import { Router } from 'express';
import { getPool } from '../db/connection.js';

const router = Router();


router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'azure-banking-api',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: err.message,
    });
  }
});

export default router;
