import { 
  Product, Sale, CashSession, CashMovement, User, UserRole, 
  CorporateAgreement, CorporateEmployee, CorporateConsumption, CorporateInvoice 
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText || response.statusText}`);
  }
  return response.json();
}

const mapProduct = (row: any): Product => ({
  id: row.id,
  code: row.code,
  name: row.name,
  category: row.category,
  price: parseFloat(row.price),
  cost: parseFloat(row.cost),
  stock: parseInt(row.stock),
  active: row.active,
  unit: row.unit,
  image: row.image,
});

const mapSale = (row: any): Sale => ({
  id: row.id,
  orderNumber: row.order_number,
  customerName: row.customer_name,
  items: Array.isArray(row.items) ? row.items : JSON.parse(row.items || '[]'),
  subtotal: parseFloat(row.subtotal),
  discount: parseFloat(row.discount),
  total: parseFloat(row.total),
  paymentMethod: row.payment_method,
  timestamp: row.timestamp,
  status: row.status,
  operatorId: row.operator_id,
  agreementId: row.agreement_id,
  employeeId: row.employee_id,
});

const mapCashSession = (row: any): CashSession => ({
  id: row.id,
  openedAt: row.opened_at,
  closedAt: row.closed_at,
  initialBalance: parseFloat(row.initial_balance),
  finalBalance: row.final_balance ? parseFloat(row.final_balance) : undefined,
  totalSales: parseFloat(row.total_sales),
  operatorId: row.operator_id,
  status: row.status,
});

const mapCashMovement = (row: any): CashMovement => ({
  id: row.id,
  sessionId: row.session_id,
  type: row.type,
  amount: parseFloat(row.amount),
  description: row.description,
  timestamp: row.timestamp,
});

const mapUser = (row: any): User => ({
  id: row.id,
  name: row.name,
  username: row.username,
  role: row.role,
});

const mapAgreement = (row: any): CorporateAgreement => ({
  id: row.id,
  taxId: row.tax_id,
  companyName: row.company_name,
  tradeName: row.trade_name,
  responsible: row.responsible,
  phone: row.phone,
  email: row.email,
  closingDay: row.closing_day,
  dueDay: row.due_day,
  creditLimit: parseFloat(row.credit_limit),
  type: row.type,
  fixedDailyQty: row.fixed_daily_qty,
  fixedDailyPrice: row.fixed_daily_price ? parseFloat(row.fixed_daily_price) : undefined,
  active: row.active,
});

const mapEmployee = (row: any): CorporateEmployee => ({
  id: row.id,
  agreementId: row.agreement_id,
  name: row.name,
  taxId: row.tax_id,
  registration: row.registration,
  limit: row.limit_amount ? parseFloat(row.limit_amount) : undefined,
  companyContributionPercent: parseFloat(row.company_contribution_percent),
  employeeContributionPercent: parseFloat(row.employee_contribution_percent),
  active: row.active,
});

const mapConsumption = (row: any): CorporateConsumption => ({
  id: row.id,
  agreementId: row.agreement_id,
  employeeId: row.employee_id,
  saleId: row.sale_id,
  description: row.description,
  amount: parseFloat(row.amount),
  quantity: row.quantity,
  timestamp: row.timestamp,
  status: row.status,
  invoiceId: row.invoice_id,
});

const mapInvoice = (row: any): CorporateInvoice => ({
  id: row.id,
  agreementId: row.agreement_id,
  periodStart: row.period_start,
  periodEnd: row.period_end,
  issueDate: row.issue_date,
  dueDate: row.due_date,
  totalAmount: parseFloat(row.total_amount),
  status: row.status,
});

export const db = {
  init: async () => {
    try {
      await fetchAPI('/health');
    } catch (e) {
      console.warn('API not available, using offline mode');
    }
  },

  getCategories: async (): Promise<string[]> => {
    return fetchAPI('/categories');
  },
  saveCategory: async (category: string) => {
    await fetchAPI('/categories', {
      method: 'POST',
      body: JSON.stringify({ name: category }),
    });
  },
  deleteCategory: async (category: string) => {
    await fetchAPI(`/categories/${encodeURIComponent(category)}`, {
      method: 'DELETE',
    });
  },

  getProducts: async (): Promise<Product[]> => {
    const rows = await fetchAPI('/products');
    return rows.map(mapProduct);
  },
  saveProduct: async (product: Product) => {
    await fetchAPI('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },
  deleteProduct: async (id: string) => {
    await fetchAPI(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  getSales: async (): Promise<Sale[]> => {
    const rows = await fetchAPI('/sales');
    return rows.map(mapSale);
  },
  saveSale: async (sale: Sale) => {
    // console.log('Saving sale:', JSON.stringify({
    //   id: sale.id,
    //   orderNumber: sale.orderNumber,
    //   customerName: sale.customerName,
    //   items: sale.items,
    //   subtotal: sale.subtotal,
    //   discount: sale.discount,
    //   total: sale.total,
    //   paymentMethod: sale.paymentMethod,
    //   timestamp: sale.timestamp,
    //   status: sale.status,
    //   operatorId: sale.operatorId,
    //   agreementId: sale.agreementId,
    //   employeeId: sale.employeeId,
    // }));
    await fetchAPI('/sales', {
      method: 'POST',
      body: JSON.stringify({
        id: sale.id,
        orderNumber: sale.orderNumber,
        customerName: sale.customerName,
        items: sale.items,
        subtotal: sale.subtotal,
        discount: sale.discount,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        timestamp: sale.timestamp,
        status: sale.status,
        operatorId: sale.operatorId,
        agreementId: sale.agreementId,
        employeeId: sale.employeeId,
      }),
    });
  },
  cancelSale: async (id: string) => {
    await fetchAPI(`/sales/${id}/cancel`, {
      method: 'PUT',
    });
  },

  getAgreements: async (): Promise<CorporateAgreement[]> => {
    const rows = await fetchAPI('/agreements');
    return rows.map(mapAgreement);
  },
  saveAgreement: async (agreement: CorporateAgreement) => {
    await fetchAPI('/agreements', {
      method: 'POST',
      body: JSON.stringify({
        id: agreement.id,
        taxId: agreement.taxId,
        companyName: agreement.companyName,
        tradeName: agreement.tradeName,
        responsible: agreement.responsible,
        phone: agreement.phone,
        email: agreement.email,
        closingDay: agreement.closingDay,
        dueDay: agreement.dueDay,
        creditLimit: agreement.creditLimit,
        type: agreement.type,
        fixedDailyQty: agreement.fixedDailyQty,
        fixedDailyPrice: agreement.fixedDailyPrice,
        active: agreement.active,
      }),
    });
  },

  getEmployees: async (agreementId?: string): Promise<CorporateEmployee[]> => {
    const endpoint = agreementId ? `/employees?agreementId=${agreementId}` : '/employees';
    const rows = await fetchAPI(endpoint);
    return rows.map(mapEmployee);
  },
  saveEmployee: async (employee: CorporateEmployee) => {
    await fetchAPI('/employees', {
      method: 'POST',
      body: JSON.stringify({
        id: employee.id,
        agreementId: employee.agreementId,
        name: employee.name,
        taxId: employee.taxId,
        registration: employee.registration,
        limit: employee.limit,
        companyContributionPercent: employee.companyContributionPercent,
        employeeContributionPercent: employee.employeeContributionPercent,
        active: employee.active,
      }),
    });
  },

  getConsumptions: async (agreementId?: string): Promise<CorporateConsumption[]> => {
    const endpoint = agreementId ? `/consumptions?agreementId=${agreementId}` : '/consumptions';
    const rows = await fetchAPI(endpoint);
    return rows.map(mapConsumption);
  },
  saveConsumption: async (consumption: CorporateConsumption) => {
    await fetchAPI('/consumptions', {
      method: 'POST',
      body: JSON.stringify({
        id: consumption.id,
        agreementId: consumption.agreementId,
        employeeId: consumption.employeeId,
        saleId: consumption.saleId,
        description: consumption.description,
        amount: consumption.amount,
        quantity: consumption.quantity,
        timestamp: consumption.timestamp,
        status: consumption.status,
        invoiceId: consumption.invoiceId,
      }),
    });
  },
  deleteConsumption: async (id: string) => {
    await fetchAPI(`/consumptions/${id}`, {
      method: 'DELETE',
    });
  },

  getInvoices: async (agreementId?: string): Promise<CorporateInvoice[]> => {
    const endpoint = agreementId ? `/invoices?agreementId=${agreementId}` : '/invoices';
    const rows = await fetchAPI(endpoint);
    return rows.map(mapInvoice);
  },
  saveInvoice: async (invoice: CorporateInvoice) => {
    await fetchAPI('/invoices', {
      method: 'POST',
      body: JSON.stringify({
        id: invoice.id,
        agreementId: invoice.agreementId,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        totalAmount: invoice.totalAmount,
        status: invoice.status,
      }),
    });
  },
  closeAgreementPeriod: async (agreementId: string, start: string, end: string) => {
    return fetchAPI('/invoices/close-period', {
      method: 'POST',
      body: JSON.stringify({ agreementId, start, end }),
    });
  },

  getCashSessions: async (): Promise<CashSession[]> => {
    const rows = await fetchAPI('/cashier/sessions');
    return rows.map(mapCashSession);
  },
  getCurrentSession: async (): Promise<CashSession | undefined> => {
    const row = await fetchAPI('/cashier/current');
    return row ? mapCashSession(row) : undefined;
  },
  openCashier: async (session: CashSession) => {
    await fetchAPI('/cashier/open', {
      method: 'POST',
      body: JSON.stringify({
        id: session.id,
        initialBalance: session.initialBalance,
        operatorId: session.operatorId,
      }),
    });
  },
  closeCashier: async (sessionId: string, finalBalance: number) => {
    await fetchAPI('/cashier/close', {
      method: 'POST',
      body: JSON.stringify({ id: sessionId, finalBalance }),
    });
  },
  addMovement: async (movement: CashMovement) => {
    await fetchAPI('/cashier/movements', {
      method: 'POST',
      body: JSON.stringify({
        id: movement.id,
        sessionId: movement.sessionId,
        type: movement.type,
        amount: movement.amount,
        description: movement.description,
      }),
    });
  },
  getMovements: async (sessionId: string): Promise<CashMovement[]> => {
    const rows = await fetchAPI(`/cashier/movements/${sessionId}`);
    return rows.map(mapCashMovement);
  },
  getUsers: async (): Promise<User[]> => {
    const rows = await fetchAPI('/users');
    return rows.map(mapUser);
  },
  login: async (username: string, password: string): Promise<User | null> => {
    try {
      return await fetchAPI('/users/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
    } catch {
      return null;
    }
  },
};
