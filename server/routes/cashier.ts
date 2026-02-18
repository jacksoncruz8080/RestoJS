import { Router } from 'express';
import { pool } from '../database.js';

const router = Router();

router.get('/sessions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cash_sessions ORDER BY opened_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.get('/current', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cash_sessions WHERE status = 'OPEN' LIMIT 1");
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current session' });
  }
});

router.post('/open', async (req, res) => {
  try {
    const { id, initialBalance, operatorId } = req.body;
    await pool.query("UPDATE cash_sessions SET status = 'CLOSED' WHERE status = 'OPEN'");
    await pool.query(
      `INSERT INTO cash_sessions (id, initial_balance, operator_id, status) VALUES ($1, $2, $3, 'OPEN')`,
      [id, initialBalance, operatorId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to open session' });
  }
});

router.post('/close', async (req, res) => {
  try {
    const { id, finalBalance } = req.body;
    await pool.query(
      "UPDATE cash_sessions SET status = 'CLOSED', closed_at = CURRENT_TIMESTAMP, final_balance = $1 WHERE id = $2",
      [finalBalance, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to close session' });
  }
});

router.get('/movements/:sessionId', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cash_movements WHERE session_id = $1 ORDER BY timestamp DESC', [req.params.sessionId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch movements' });
  }
});

router.post('/movements', async (req, res) => {
  try {
    const { id, sessionId, type, amount, description } = req.body;
    await pool.query(
      `INSERT INTO cash_movements (id, session_id, type, amount, description) VALUES ($1, $2, $3, $4, $5)`,
      [id, sessionId, type, amount, description]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add movement' });
  }
});

export default router;
