import { Router } from 'express';
import { pool } from '../database.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id, code, name, category, price, cost, stock, active, unit, image } = req.body;
    await pool.query(
      `INSERT INTO products (id, code, name, category, price, cost, stock, active, unit, image) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
       code = EXCLUDED.code, name = EXCLUDED.name, category = EXCLUDED.category,
       price = EXCLUDED.price, cost = EXCLUDED.cost, stock = EXCLUDED.stock,
       active = EXCLUDED.active, unit = EXCLUDED.unit, image = EXCLUDED.image,
       updated_at = CURRENT_TIMESTAMP`,
      [id, code, name, category, price, cost, stock, active, unit, image]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save product' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
