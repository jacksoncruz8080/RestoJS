import { Router } from 'express';
import { pool } from '../database.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sales ORDER BY timestamp DESC');
    const sales = result.rows.map(s => ({
      ...s,
      items: typeof s.items === 'string' ? JSON.parse(s.items) : s.items
    }));
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id, orderNumber, customerName, items, subtotal, discount, total, paymentMethod, timestamp, status, operatorId, agreementId, employeeId } = req.body;
    
    // Validar dados
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items inválidos' });
    }
    
    const itemsJson = JSON.stringify(items);
    
    await pool.query(
      `INSERT INTO sales (id, order_number, customer_name, items, subtotal, discount, total, payment_method, timestamp, status, operator_id, agreement_id, employee_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
       order_number = EXCLUDED.order_number, customer_name = EXCLUDED.customer_name,
       items = EXCLUDED.items, subtotal = EXCLUDED.subtotal, discount = EXCLUDED.discount,
       total = EXCLUDED.total, payment_method = EXCLUDED.payment_method,
       timestamp = EXCLUDED.timestamp, status = EXCLUDED.status,
       agreement_id = EXCLUDED.agreement_id, employee_id = EXCLUDED.employee_id`,
      [id, orderNumber, customerName, itemsJson, subtotal, discount, total, paymentMethod, timestamp, status, operatorId, agreementId, employeeId]
    );
    
    if (status === 'COMPLETED') {
      for (const item of items) {
        const qty = parseFloat(item.quantity) || 0;
        if (qty > 0) {
          await pool.query(
            'UPDATE products SET stock = stock - $1 WHERE id = $2',
            [qty, item.productId]
          );
        }
      }
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving sale:', error);
    res.status(500).json({ error: 'Failed to save sale: ' + error.message });
  }
});

router.put('/:id/cancel', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sales WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    const sale = result.rows[0];
    if (sale.status === 'COMPLETED') {
      const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
      for (const item of items) {
        await pool.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.productId]
        );
      }
      await pool.query('UPDATE sales SET status = $1 WHERE id = $2', ['CANCELLED', req.params.id]);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel sale' });
  }
});

export default router;
