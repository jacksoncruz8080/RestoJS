
import React, { useMemo, useState, useEffect } from 'react';
import { db } from '../services/db';
import { Sale, CorporateAgreement, CorporateConsumption, CorporateInvoice, AgreementType, CashSession, CashMovement } from '../types';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, Users, ChevronUp, ChevronDown, Building2, AlertTriangle, Calendar, Printer, X, Package } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [agreements, setAgreements] = useState<CorporateAgreement[]>([]);
  const [consumptions, setConsumptions] = useState<CorporateConsumption[]>([]);
  const [invoices, setInvoices] = useState<CorporateInvoice[]>([]);
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const [salesData, agreementsData, consumptionsData, invoicesData, sessionsData, productsData] = await Promise.all([
        db.getSales(),
        db.getAgreements(),
        db.getConsumptions(),
        db.getInvoices(),
        db.getCashSessions(),
        db.getProducts()
      ]);
      setSales(salesData);
      setAgreements(agreementsData);
      setConsumptions(consumptionsData);
      setInvoices(invoicesData);
      setCashSessions(sessionsData);
      setProducts(productsData);
      
      const allMovements: CashMovement[] = [];
      for (const session of sessionsData) {
        const movements = await db.getMovements(session.id);
        allMovements.push(...movements);
      }
      setCashMovements(allMovements);
    };
    loadData();
  }, []);

  const completedSales = useMemo(() => sales.filter(s => s.status === 'COMPLETED'), [sales]);
  
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const salesToday = completedSales.filter(s => s.timestamp.startsWith(today));
    
    const totalToday = salesToday.reduce((acc, curr) => acc + curr.total, 0);
    const totalMonth = completedSales.reduce((acc, curr) => {
      const saleDate = new Date(curr.timestamp);
      const isThisMonth = saleDate.getMonth() === new Date().getMonth();
      return isThisMonth ? acc + curr.total : acc;
    }, 0);
    
    const ticketMedio = completedSales.length > 0 ? completedSales.reduce((acc, curr) => acc + curr.total, 0) / completedSales.length : 0;
    
    return {
      totalToday,
      totalMonth,
      ticketMedio,
      countToday: salesToday.length
    };
  }, [completedSales]);

  const agreementForecasts = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return agreements.map(agreement => {
      const companyInvoices = invoices
        .filter(inv => inv.agreementId === agreement.id)
        .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
        .slice(0, 3);
      
      const movingAverage = companyInvoices.length > 0 
        ? companyInvoices.reduce((acc, curr) => acc + curr.totalAmount, 0) / companyInvoices.length 
        : 0;

      const monthStart = new Date(currentYear, currentMonth, 1).toISOString();
      const currentMonthConsumptions = consumptions.filter(c => 
        c.agreementId === agreement.id && 
        c.timestamp >= monthStart
      );

      const realAmountSoFar = currentMonthConsumptions.reduce((acc, curr) => acc + curr.amount, 0);
      
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const dailyAvg = dayOfMonth > 0 ? realAmountSoFar / dayOfMonth : 0;
      const projectedTotal = dailyAvg * daysInMonth;

      const trend = movingAverage > 0 ? ((projectedTotal - movingAverage) / movingAverage) * 100 : 0;

      return {
        ...agreement,
        realAmountSoFar,
        projectedTotal,
        movingAverage,
        dailyAvg,
        trend
      };
    });
  }, [agreements, consumptions, invoices]);

  const totalProjectedRevenue = useMemo(() => 
    agreementForecasts.reduce((acc, curr) => acc + curr.projectedTotal, 0), 
  [agreementForecasts]);

  const salesByDay = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const daySales = completedSales.filter(s => s.timestamp.startsWith(date));
      return {
        date: date.split('-').slice(2).join('/'),
        total: daySales.reduce((acc, curr) => acc + curr.total, 0)
      };
    });
  }, [completedSales]);

  const salesByPayment = useMemo(() => {
    const methods = ['CASH', 'CREDIT', 'DEBIT', 'PIX', 'AGREEMENT'];
    return methods.map(method => ({
      name: method === 'CASH' ? 'Dinheiro' : method === 'CREDIT' ? 'Crédito' : method === 'DEBIT' ? 'Débito' : method === 'PIX' ? 'Pix' : 'Convênio',
      value: completedSales.filter(s => s.paymentMethod === method).length
    }));
  }, [completedSales]);

  const topProductsByCategory = useMemo(() => {
    const productSales: Record<string, { name: string; category: string; quantity: number; total: number }> = {};
    
    completedSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const key = item.productId;
        if (!productSales[key]) {
          productSales[key] = {
            name: item.name,
            category: product?.category || 'Sem Categoria',
            quantity: 0,
            total: 0
          };
        }
        productSales[key].quantity += item.quantity;
        productSales[key].total += item.total;
      });
    });

    const byCategory: Record<string, typeof productSales[string]> = {};
    Object.values(productSales).forEach(ps => {
      if (!byCategory[ps.category] || byCategory[ps.category].quantity < ps.quantity) {
        byCategory[ps.category] = ps;
      }
    });

    return Object.entries(byCategory).map(([category, data]) => ({
      category,
      ...data
    })).sort((a, b) => b.quantity - a.quantity);
  }, [completedSales, products]);

  const reportData = useMemo(() => {
    if (!reportStartDate || !reportEndDate) return null;
    
    const start = new Date(reportStartDate).toISOString().split('T')[0];
    const end = new Date(reportEndDate + 'T23:59:59').toISOString();

    const filteredSales = completedSales.filter(s => s.timestamp >= start && s.timestamp <= end);
    const filteredMovements = cashMovements.filter(m => m.timestamp <= end);

    const totalVendas = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const totalEntradas = filteredMovements
      .filter(m => m.type === 'REFORCO')
      .reduce((acc, m) => acc + m.amount, 0);
    const totalSaidas = filteredMovements
      .filter(m => m.type === 'SANGRIA')
      .reduce((acc, m) => acc + m.amount, 0);

    return {
      sales: filteredSales,
      movements: filteredMovements,
      totalVendas,
      totalEntradas,
      totalSaidas,
      saldoFinal: totalVendas + totalEntradas - totalSaidas
    };
  }, [reportStartDate, reportEndDate, completedSales, cashMovements]);

  const printReport = () => {
    if (!reportData) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Vendas - ${reportStartDate} a ${reportEndDate}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .totals { margin-top: 20px; text-align: right; }
          .totals div { margin: 5px 0; font-size: 16px; }
          .header { text-align: center; margin-bottom: 30px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório de Vendas</h1>
          <p>Período: ${reportStartDate} a ${reportEndDate}</p>
        </div>
        
        <h2>Resumo Financeiro</h2>
        <div class="totals">
          <div><strong>Total Vendas:</strong> R$ ${reportData.totalVendas.toFixed(2)}</div>
          <div><strong>Entradas (Reforço):</strong> R$ ${reportData.totalEntradas.toFixed(2)}</div>
          <div><strong>Saídas (Sangria):</strong> R$ ${reportData.totalSaidas.toFixed(2)}</div>
          <div><strong>Saldo Final:</strong> R$ ${reportData.saldoFinal.toFixed(2)}</div>
        </div>

        <h2>Detalhamento de Vendas (${reportData.sales.length})</h2>
        <table>
          <tr>
            <th>Nº Pedido</th>
            <th>Data/Hora</th>
            <th>Cliente</th>
            <th>Pagamento</th>
            <th>Valor</th>
          </tr>
          ${reportData.sales.map(s => `
            <tr>
              <td>${s.orderNumber}</td>
              <td>${new Date(s.timestamp).toLocaleString('pt-BR')}</td>
              <td>${s.customerName || 'Balcão'}</td>
              <td>${s.paymentMethod || '-'}</td>
              <td>R$ ${s.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </table>

        <h2>Movimentações de Caixa</h2>
        <table>
          <tr>
            <th>Data/Hora</th>
            <th>Tipo</th>
            <th>Descrição</th>
            <th>Valor</th>
          </tr>
          ${reportData.movements.map(m => `
            <tr>
              <td>${new Date(m.timestamp).toLocaleString('pt-BR')}</td>
              <td>${m.type === 'REFORCO' ? 'Entrada' : 'Saída'}</td>
              <td>${m.description || '-'}</td>
              <td>${m.type === 'REFORCO' ? '+' : '-'}R$ ${m.amount.toFixed(2)}</td>
            </tr>
          `).join('')}
        </table>

        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#6366f1'];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Dashboard Gerencial</h2>
          <p className="text-gray-500 font-medium">Análise de vendas, financeiro e previsões inteligentes.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowReportModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all"
          >
            <Printer size={20} /> Imprimir Relatório
          </button>
          <div className="bg-white px-6 py-3 rounded-2xl border shadow-sm flex items-center gap-3">
            <Calendar className="text-orange-500" size={20} />
            <span className="font-bold text-gray-700">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Vendas Hoje" 
          value={`R$ ${stats.totalToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<DollarSign className="text-orange-600" size={24} />}
          bg="bg-orange-50"
          trend="+12%"
        />
        <StatCard 
          title="Faturamento Projetado (Convênios)" 
          value={`R$ ${totalProjectedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<Building2 className="text-blue-600" size={24} />}
          bg="bg-blue-50"
          trend={`${agreementForecasts.length > 0 ? '+' : ''}${agreementForecasts.length}% Convênios`}
        />
        <StatCard 
          title="Ticket Médio" 
          value={`R$ ${stats.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<ShoppingBag className="text-emerald-600" size={24} />}
          bg="bg-emerald-50"
        />
        <StatCard 
          title="Total Vendas Mês" 
          value={`R$ ${stats.totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<TrendingUp className="text-purple-600" size={24} />}
          bg="bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-black text-gray-800 uppercase text-xs tracking-widest">Produtos Mais Vendidos por Categoria</h4>
              <p className="text-xs text-gray-400 font-medium">Top produto de cada categoria</p>
            </div>
          </div>
          <div className="space-y-3">
            {topProductsByCategory.map((item, index) => (
              <div key={item.category} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center font-black text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm uppercase">{item.name}</p>
                    <p className="text-xs text-gray-400 font-medium">{item.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-800">{item.quantity.toFixed(2)} un</p>
                  <p className="text-xs text-gray-400">R$ {item.total.toFixed(2)}</p>
                </div>
              </div>
            ))}
            {topProductsByCategory.length === 0 && (
              <p className="text-center text-gray-400 py-4">Sem dados de vendas</p>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-black text-gray-800 uppercase text-xs tracking-widest">Vendas (Últimos 7 Dias)</h4>
              <p className="text-xs text-gray-400 font-medium">Evolução diária</p>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(v) => `R$${v}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '15px' }} 
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Vendas']}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#f97316" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#f97316', strokeWidth: 3, stroke: '#fff' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden">
            <header className="p-8 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-black flex items-center gap-2">
                <Printer className="text-blue-600" />
                Imprimir Relatório
              </h3>
              <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
            </header>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase block mb-2">Data Inicial</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase block mb-2">Data Final</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                  />
                </div>
              </div>

              {reportData && (
                <div className="bg-gray-50 p-6 rounded-2xl space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Vendas:</span>
                    <span className="font-black text-gray-800">R$ {reportData.totalVendas.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Entradas:</span>
                    <span className="font-black text-emerald-600">+ R$ {reportData.totalEntradas.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Saídas:</span>
                    <span className="font-black text-red-600">- R$ {reportData.totalSaidas.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-black text-gray-800">Saldo Final:</span>
                    <span className="font-black text-orange-600">R$ {reportData.saldoFinal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button 
                onClick={printReport}
                disabled={!reportStartDate || !reportEndDate}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Gerar e Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, bg, trend }: any) => (
  <div className="bg-white p-8 rounded-[2rem] border shadow-sm hover:shadow-xl transition-all duration-300 group">
    <div className="flex items-center justify-between mb-6">
      <div className={`p-4 rounded-2xl ${bg} group-hover:scale-110 transition-transform duration-300`}>{icon}</div>
      {trend && (
        <span className={`text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-widest ${trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {trend.startsWith('+') ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
          {trend}
        </span>
      )}
    </div>
    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
    <h4 className="text-2xl font-black text-gray-800 tracking-tighter">{value}</h4>
  </div>
);

export default Dashboard;
