import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool, initDatabase } from './database.js';
import productsRouter from './routes/products.js';
import categoriesRouter from './routes/categories.js';
import salesRouter from './routes/sales.js';
import usersRouter from './routes/users.js';
import agreementsRouter from './routes/agreements.js';
import employeesRouter from './routes/employees.js';
import consumptionsRouter from './routes/consumptions.js';
import invoicesRouter from './routes/invoices.js';
import cashierRouter from './routes/cashier.js';

const app = express();
const PORT = process.env.PORT || 3001;

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/sales', salesRouter);
app.use('/api/users', usersRouter);
app.use('/api/agreements', agreementsRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/consumptions', consumptionsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/cashier', cashierRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const startServer = async () => {
  try {
    await initDatabase();
    console.log('Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
