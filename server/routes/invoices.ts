import { Router } from 'express';
import { pool } from '../database.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { agreementId } = req.query;
    let query = 'SELECT * FROM invoices';
    let params: any[] = [];
    if (agreementId) {
      query += ' WHERE agreement_id = $1';
      params = [agreementId];
    }
    query += ' ORDER BY issue_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id, agreementId, periodStart, periodEnd, issueDate, dueDate, totalAmount, status } = req.body;
    await pool.query(
      `INSERT INTO invoices (id, agreement_id, period_start, period_end, issue_date, due_date, total_amount, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
       agreement_id = EXCLUDED.agreement_id, period_start = EXCLUDED.period_start,
       period_end = EXCLUDED.period_end, issue_date = EXCLUDED.issue_date,
       due_date = EXCLUDED.due_date, total_amount = EXCLUDED.total_amount, status = EXCLUDED.status`,
      [id, agreementId, periodStart, periodEnd, issueDate, dueDate, totalAmount, status]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save invoice' });
  }
});

router.post('/close-period', async (req, res) => {
  const client = await pool.connect();
  try {
    const { agreementId, start, end } = req.body;
    
    await client.query('BEGIN');
    
    const consumptionsResult = await client.query(
      `SELECT * FROM consumptions WHERE agreement_id = $1 AND status = 'PENDING' AND timestamp >= $2 AND timestamp <= $3`,
      [agreementId, start, end]
    );
    
    if (consumptionsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Sem consumos pendentes para este período.' });
    }
    
    const total = consumptionsResult.rows.reduce((acc, c) => acc + parseFloat(c.amount), 0);
    const invoiceId = Math.random().toString(36).substr(2, 9);
    const issueDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);
    
    await client.query(
      `INSERT INTO invoices (id, agreement_id, period_start, period_end, issue_date, due_date, total_amount, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN')`,
      [invoiceId, agreementId, start, end, issueDate, dueDate.toISOString().split('T')[0], total]
    );
    
    for (const c of consumptionsResult.rows) {
      await client.query(
        'UPDATE consumptions SET status = $1, invoice_id = $2 WHERE id = $3',
        ['INVOICED', invoiceId, c.id]
      );
    }
    
    await client.query('COMMIT');
    res.json({ id: invoiceId, totalAmount: total, dueDate: dueDate.toISOString().split('T')[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to close period' });
  } finally {
    client.release();
  }
});

export default router;
