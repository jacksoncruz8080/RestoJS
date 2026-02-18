import { Router } from 'express';
import { pool } from '../database.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { agreementId } = req.query;
    let query = 'SELECT * FROM employees';
    let params: any[] = [];
    if (agreementId) {
      query += ' WHERE agreement_id = $1';
      params = [agreementId];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id, agreementId, name, taxId, registration, limit, companyContributionPercent, employeeContributionPercent, active } = req.body;
    await pool.query(
      `INSERT INTO employees (id, agreement_id, name, tax_id, registration, limit_amount, company_contribution_percent, employee_contribution_percent, active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
       agreement_id = EXCLUDED.agreement_id, name = EXCLUDED.name, tax_id = EXCLUDED.tax_id,
       registration = EXCLUDED.registration, limit_amount = EXCLUDED.limit_amount,
       company_contribution_percent = EXCLUDED.company_contribution_percent,
       employee_contribution_percent = EXCLUDED.employee_contribution_percent, active = EXCLUDED.active`,
      [id, agreementId, name, taxId, registration, limit, companyContributionPercent, employeeContributionPercent, active]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save employee' });
  }
});

export default router;
