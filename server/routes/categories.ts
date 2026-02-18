import { Router } from 'express';
import { pool } from '../database.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows.map(r => r.name));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    await pool.query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save category' });
  }
});

router.delete('/:name', async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE name = $1', [req.params.name]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
