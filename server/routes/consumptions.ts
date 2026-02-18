import { Router } from 'express';
import { pool } from '../database.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { agreementId } = req.query;
    let query = 'SELECT * FROM consumptions';
    let params: any[] = [];
    if (agreementId) {
      query += ' WHERE agreement_id = $1';
      params = [agreementId];
    }
    query += ' ORDER BY timestamp DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch consumptions' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id, agreementId, employeeId, saleId, description, amount, quantity, timestamp, status, invoiceId } = req.body;
    await pool.query(
      `INSERT INTO consumptions (id, agreement_id, employee_id, sale_id, description, amount, quantity, timestamp, status, invoice_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
       agreement_id = EXCLUDED.agreement_id, employee_id = EXCLUDED.employee_id, sale_id = EXCLUDED.sale_id,
       description = EXCLUDED.description, amount = EXCLUDED.amount, quantity = EXCLUDED.quantity,
       timestamp = EXCLUDED.timestamp, status = EXCLUDED.status, invoice_id = EXCLUDED.invoice_id`,
      [id, agreementId, employeeId, saleId, description, amount, quantity, timestamp, status, invoiceId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save consumption' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM consumptions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete consumption' });
  }
});

export default router;
