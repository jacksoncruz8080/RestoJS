
export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  username: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  active: boolean;
  unit: 'UN' | 'KG';
  image?: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: 'UN' | 'KG';
  total: number;
}

export interface Sale {
  id: string;
  orderNumber: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod?: 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX' | 'AGREEMENT';
  timestamp: string;
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
  operatorId: string;
  agreementId?: string;
  employeeId?: string;
}

export interface CashSession {
  id: string;
  openedAt: string;
  closedAt?: string;
  initialBalance: number;
  finalBalance?: number;
  totalSales: number;
  operatorId: string;
  status: 'OPEN' | 'CLOSED';
}

export interface CashMovement {
  id: string;
  sessionId: string;
  type: 'SANGRIA' | 'REFORCO';
  amount: number;
  description: string;
  timestamp: string;
}

// --- CONVÊNIOS ---

export enum AgreementType {
  FIXED_DAILY = 'FIXED_DAILY', // Marmita fixa diária
  INDIVIDUAL_CONSUMPTION = 'INDIVIDUAL_CONSUMPTION' // Consumo por funcionário
}

export interface CorporateAgreement {
  id: string;
  taxId: string; // CNPJ
  companyName: string;
  tradeName: string;
  responsible: string;
  phone: string;
  email: string;
  closingDay: number;
  dueDay: number;
  creditLimit: number;
  type: AgreementType;
  fixedDailyQty?: number;
  fixedDailyPrice?: number;
  active: boolean;
}

export interface CorporateEmployee {
  id: string;
  agreementId: string;
  name: string;
  taxId?: string;
  registration?: string;
  limit?: number;
  companyContributionPercent: number; // % pago pela empresa
  employeeContributionPercent: number; // % pago pelo funcionário
  active: boolean;
}

export interface CorporateConsumption {
  id: string;
  agreementId: string;
  employeeId?: string;
  saleId?: string; // Se for via PDV
  description: string;
  amount: number;
  quantity: number;
  timestamp: string;
  status: 'PENDING' | 'INVOICED';
  invoiceId?: string;
}

export interface CorporateInvoice {
  id: string;
  agreementId: string;
  periodStart: string;
  periodEnd: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status: 'OPEN' | 'PAID' | 'OVERDUE';
}
