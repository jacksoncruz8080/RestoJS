
import React, { useMemo, useState, useEffect } from 'react';
import { db } from '../services/db';
import { Sale, CorporateAgreement, CorporateConsumption, CorporateInvoice, AgreementType } from '../types';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, Users, ChevronUp, ChevronDown, Building2, AlertTriangle, Calendar } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [agreements, setAgreements] = useState<CorporateAgreement[]>([]);
  const [consumptions, setConsumptions] = useState<CorporateConsumption[]>([]);
  const [invoices, setInvoices] = useState<CorporateInvoice[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [salesData, agreementsData, consumptionsData, invoicesData] = await Promise.all([
        db.getSales(),
        db.getAgreements(),
        db.getConsumptions(),
        db.getInvoices()
      ]);
      setSales(salesData);
      setAgreements(agreementsData);
      setConsumptions(consumptionsData);
      setInvoices(invoicesData);
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

  const forecastChartData = useMemo(() => 
    agreementForecasts.slice(0, 5).map(f => ({
      name: f.tradeName,
      'Real': f.realAmountSoFar,
      'Projetado': f.projectedTotal
    })), 
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

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#6366f1'];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Dashboard Gerencial</h2>
          <p className="text-gray-500 font-medium">Análise de vendas, financeiro e previsões inteligentes.</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border shadow-sm flex items-center gap-3">
          <Calendar className="text-orange-500" size={20} />
          <span className="font-bold text-gray-700">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</span>
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

      <section className="space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
             <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100">
               <TrendingUp size={20} />
             </div>
             Previsão de Consumo de Convênios
           </h3>
           <div className="flex gap-2">
             <span className="px-3 py-1 bg-gray-100 text-gray-400 text-[10px] font-black rounded-lg uppercase">Base: Média Móvel 3 Meses</span>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
            <div className="flex justify-between items-start">
               <div>
                  <h4 className="font-black text-gray-800 uppercase text-xs tracking-widest">Performance Top 5 Convênios</h4>
                  <p className="text-xs text-gray-400 font-medium">Comparação entre consumo atual e meta projetada.</p>
               </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '15px' }} 
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" />
                  <Bar dataKey="Real" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="Projetado" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
            <h4 className="font-black text-gray-800 uppercase text-xs tracking-widest">Alertas de Tendência</h4>
            <div className="space-y-4 overflow-y-auto max-h-[350px] scrollbar-hide">
              {agreementForecasts.length === 0 ? (
                <div className="py-10 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest">Sem dados de convênio.</div>
              ) : (
                agreementForecasts.sort((a, b) => b.projectedTotal - a.projectedTotal).map(f => (
                  <div key={f.id} className="p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-100 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-black text-gray-800 text-xs uppercase truncate max-w-[150px]">{f.tradeName}</span>
                      <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg ${f.trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {f.trend >= 0 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {Math.abs(f.trend).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                         <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">Projeção: <b className="text-gray-600">R$ {f.projectedTotal.toFixed(2)}</b></p>
                         <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">Média Diária: <b className="text-gray-600">R$ {f.dailyAvg.toFixed(2)}</b></p>
                      </div>
                      {Math.abs(f.trend) > 20 && (
                        <div className="bg-orange-100 text-orange-600 p-1.5 rounded-lg" title="Oscilação alta detectada!">
                          <AlertTriangle size={14} />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${f.trend > 0 ? 'bg-blue-500' : 'bg-orange-400'}`} 
                        style={{ width: `${Math.min(100, (f.realAmountSoFar / Math.max(f.projectedTotal, 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
            {agreementForecasts.some(f => f.trend > 15) && (
              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3 animate-pulse">
                <AlertTriangle className="text-orange-600 shrink-0" size={18} />
                <p className="text-[10px] text-orange-800 font-bold leading-tight uppercase">Crescimento acelerado detectado em {agreementForecasts.filter(f => f.trend > 15).length} convênios. Verifique o limite de crédito.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border shadow-sm">
          <h3 className="text-lg font-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
            <TrendingUp size={20} className="text-orange-500" />
            Vendas (Últimos 7 Dias)
          </h3>
          <div className="h-[300px]">
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

        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
          <h3 className="text-lg font-black mb-6 uppercase tracking-tighter">Meios de Pagamento</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesByPayment}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {salesByPayment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
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
