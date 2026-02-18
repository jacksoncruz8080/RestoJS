import { Router } from 'express';
import { pool } from '../database.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agreements ORDER BY trade_name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agreements' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id, taxId, companyName, tradeName, responsible, phone, email, closingDay, dueDay, creditLimit, type, fixedDailyQty, fixedDailyPrice, active } = req.body;
    await pool.query(
      `INSERT INTO agreements (id, tax_id, company_name, trade_name, responsible, phone, email, closing_day, due_day, credit_limit, type, fixed_daily_qty, fixed_daily_price, active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
       tax_id = EXCLUDED.tax_id, company_name = EXCLUDED.company_name, trade_name = EXCLUDED.trade_name,
       responsible = EXCLUDED.responsible, phone = EXCLUDED.phone, email = EXCLUDED.email,
       closing_day = EXCLUDED.closing_day, due_day = EXCLUDED.due_day, credit_limit = EXCLUDED.credit_limit,
       type = EXCLUDED.type, fixed_daily_qty = EXCLUDED.fixed_daily_qty, fixed_daily_price = EXCLUDED.fixed_daily_price,
       active = EXCLUDED.active`,
      [id, taxId, companyName, tradeName, responsible, phone, email, closingDay, dueDay, creditLimit, type, fixedDailyQty, fixedDailyPrice, active]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save agreement' });
  }
});

export default router;
