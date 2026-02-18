import pg from 'pg';
const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'jsresto',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// console.log('Connecting to PostgreSQL:', {
//   host: process.env.DB_HOST || 'localhost',
//   port: process.env.DB_PORT || '5432',
//   database: process.env.DB_NAME || 'jsresto',
//   user: process.env.DB_USER || 'postgres',
//   pass: process.env.DB_PASSWORD || 'postgres',
// });

export const initDatabase = async () => {
  let client;
  
  // Primeiro tenta conectar ao banco especificado
  try {
    client = await pool.connect();
  } catch (err: any) {
    // Se o banco não existir, tenta criar usando a conexão ao banco 'postgres'
    if (err.code === '3D000') { // database does not exist
      const adminPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: 'postgres',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      });
      const adminClient = await adminPool.connect();
      await adminClient.query(`CREATE DATABASE ${process.env.DB_NAME || 'jsresto'}`);
      adminClient.release();
      await adminPool.end();
    } else {
      throw err;
    }
    client = await pool.connect();
  }
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100),
        price DECIMAL(10,2) NOT NULL,
        cost DECIMAL(10,2) DEFAULT 0,
        stock INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        unit VARCHAR(10) DEFAULT 'UN',
        image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        username VARCHAR(100) NOT NULL UNIQUE,
        role VARCHAR(20) NOT NULL,
        password VARCHAR(100) DEFAULT '1234'
      );

      CREATE TABLE IF NOT EXISTS sales (
        id VARCHAR(50) PRIMARY KEY,
        order_number VARCHAR(50),
        customer_name VARCHAR(200),
        subtotal DECIMAL(10,2) DEFAULT 0,
        discount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) DEFAULT 0,
        payment_method VARCHAR(20),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'OPEN',
        operator_id VARCHAR(50),
        agreement_id VARCHAR(50),
        employee_id VARCHAR(50),
        items JSONB DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS cash_sessions (
        id VARCHAR(50) PRIMARY KEY,
        opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        initial_balance DECIMAL(10,2) DEFAULT 0,
        final_balance DECIMAL(10,2),
        total_sales DECIMAL(10,2) DEFAULT 0,
        operator_id VARCHAR(50),
        status VARCHAR(20) DEFAULT 'OPEN'
      );

      CREATE TABLE IF NOT EXISTS cash_movements (
        id VARCHAR(50) PRIMARY KEY,
        session_id VARCHAR(50) REFERENCES cash_sessions(id),
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS agreements (
        id VARCHAR(50) PRIMARY KEY,
        tax_id VARCHAR(20),
        company_name VARCHAR(200),
        trade_name VARCHAR(200),
        responsible VARCHAR(200),
        phone VARCHAR(20),
        email VARCHAR(200),
        closing_day INTEGER DEFAULT 0,
        due_day INTEGER DEFAULT 0,
        credit_limit DECIMAL(10,2) DEFAULT 0,
        type VARCHAR(50) DEFAULT 'INDIVIDUAL_CONSUMPTION',
        fixed_daily_qty INTEGER DEFAULT 0,
        fixed_daily_price DECIMAL(10,2) DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS employees (
        id VARCHAR(50) PRIMARY KEY,
        agreement_id VARCHAR(50) REFERENCES agreements(id),
        name VARCHAR(200) NOT NULL,
        tax_id VARCHAR(20),
        registration VARCHAR(50),
        limit_amount DECIMAL(10,2),
        company_contribution_percent DECIMAL(5,2) DEFAULT 100,
        employee_contribution_percent DECIMAL(5,2) DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS consumptions (
        id VARCHAR(50) PRIMARY KEY,
        agreement_id VARCHAR(50) REFERENCES agreements(id),
        employee_id VARCHAR(50),
        sale_id VARCHAR(50),
        description TEXT,
        amount DECIMAL(10,2) DEFAULT 0,
        quantity INTEGER DEFAULT 1,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'PENDING',
        invoice_id VARCHAR(50)
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(50) PRIMARY KEY,
        agreement_id VARCHAR(50) REFERENCES agreements(id),
        period_start DATE,
        period_end DATE,
        issue_date DATE DEFAULT CURRENT_DATE,
        due_date DATE,
        total_amount DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'OPEN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const categoriesResult = await client.query('SELECT COUNT(*) FROM categories');
    if (parseInt(categoriesResult.rows[0].count) === 0) {
      const defaultCategories = ['Bebidas', 'Lanches', 'Pratos Executivos', 'Sobremesas', 'Porções', 'Pizzas', 'Self-Service'];
      for (const cat of defaultCategories) {
        await client.query('INSERT INTO categories (name) VALUES ($1)', [cat]);
      }
    }

    const usersResult = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(usersResult.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO users (id, name, username, role, password) VALUES 
        ('1', 'Admin User', 'admin', 'ADMIN', 'admin653#@$'),
        ('2', 'Caixa 01', 'caixa', 'OPERATOR', 'caixa01#@$7789')
      `);
    }

    const productsResult = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(productsResult.rows[0].count) === 0) {
      const defaultProducts = [
        { id: '1', code: '001', name: 'Coca-Cola 350ml', category: 'Bebidas', price: 6.50, cost: 3.20, stock: 50, active: true, unit: 'UN', image: 'https://raw.githubusercontent.com/jacksoncruz8080/files/main/coca.jpeg' },
        { id: '2', code: '002', name: 'X-Burger Artesanal', category: 'Lanches', price: 32.90, cost: 14.50, stock: 30, active: true, unit: 'UN', image: 'https://raw.githubusercontent.com/jacksoncruz8080/files/main/xburger.jpg' },
        { id: '3', code: '003', name: 'Batata Frita G', category: 'Porções', price: 25.00, cost: 8.00, stock: 100, active: true, unit: 'UN', image: 'https://raw.githubusercontent.com/jacksoncruz8080/files/main/batata.jpeg' },
        { id: '7', code: '007', name: 'Almoço Buffet (Kg)', category: 'Self-Service', price: 69.90, cost: 22.00, stock: 999, active: true, unit: 'KG', image: 'https://raw.githubusercontent.com/jacksoncruz8080/files/main/almoco.jpg' },
        { id: '5', code: '005', name: 'Pizza Margherita M', category: 'Pizzas', price: 45.00, cost: 18.00, stock: 20, active: true, unit: 'UN', image: 'https://raw.githubusercontent.com/jacksoncruz8080/files/main/pizza.jpg' },
        { id: '6', code: '006', name: 'Pudim de Leite', category: 'Sobremesas', price: 15.00, cost: 5.00, stock: 15, active: true, unit: 'UN', image: 'https://raw.githubusercontent.com/jacksoncruz8080/files/main/pudim.jpeg' },
      ];
      for (const prod of defaultProducts) {
        await client.query(`
          INSERT INTO products (id, code, name, category, price, cost, stock, active, unit, image) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [prod.id, prod.code, prod.name, prod.category, prod.price, prod.cost, prod.stock, prod.active, prod.unit, prod.image]);
      }
    }

    console.log('Database tables and initial data created successfully');
  } finally {
    client.release();
  }
};
