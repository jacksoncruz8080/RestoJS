
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { CorporateAgreement, CorporateEmployee, CorporateConsumption, CorporateInvoice, AgreementType } from '../types';
import { Building2, Users, Receipt, Calendar, Plus, Save, Trash2, X, Download, Filter, FileText, CheckCircle, AlertCircle, History, Search } from 'lucide-react';

const Agreements: React.FC = () => {
  const [tab, setTab] = useState<'companies' | 'employees' | 'daily' | 'invoices'>('companies');
  const [agreements, setAgreements] = useState<CorporateAgreement[]>([]);
  const [employees, setEmployees] = useState<CorporateEmployee[]>([]);
  const [consumptions, setConsumptions] = useState<CorporateConsumption[]>([]);
  const [invoices, setInvoices] = useState<CorporateInvoice[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CorporateAgreement | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<CorporateEmployee | null>(null);

  const [dailyAgreement, setDailyAgreement] = useState<string>('');
  const [dailyQty, setDailyQty] = useState<number>(0);

  const [invAgreement, setInvAgreement] = useState<string>('');
  const [invStart, setInvStart] = useState('');
  const [invEnd, setInvEnd] = useState('');

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    const [agreementsData, employeesData, consumptionsData, invoicesData] = await Promise.all([
      db.getAgreements(),
      db.getEmployees(),
      db.getConsumptions(),
      db.getInvoices()
    ]);
    setAgreements(agreementsData);
    setEmployees(employeesData);
    setConsumptions(consumptionsData);
    setInvoices(invoicesData);
  };

  const handleSaveCompany = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const company: CorporateAgreement = {
      id: editingCompany?.id || Math.random().toString(36).substr(2, 9),
      taxId: formData.get('taxId') as string,
      companyName: formData.get('companyName') as string,
      tradeName: formData.get('tradeName') as string,
      responsible: formData.get('responsible') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      closingDay: Number(formData.get('closingDay')),
      dueDay: Number(formData.get('dueDay')),
      creditLimit: Number(formData.get('creditLimit')),
      type: formData.get('type') as AgreementType,
      fixedDailyQty: Number(formData.get('fixedDailyQty')) || 0,
      fixedDailyPrice: Number(formData.get('fixedDailyPrice')) || 0,
      active: true
    };
    db.saveAgreement(company);
    loadData();
    setIsModalOpen(false);
  };

  const handleSaveEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const emp: CorporateEmployee = {
      id: editingEmployee?.id || Math.random().toString(36).substr(2, 9),
      agreementId: formData.get('agreementId') as string,
      name: formData.get('name') as string,
      registration: formData.get('registration') as string,
      companyContributionPercent: Number(formData.get('companyContrib')),
      employeeContributionPercent: Number(formData.get('employeeContrib')),
      active: true
    };
    db.saveEmployee(emp);
    loadData();
    setIsModalOpen(false);
  };

  const handleDailyLaunch = () => {
    const agreement = agreements.find(a => a.id === dailyAgreement);
    if (!agreement || dailyQty <= 0) return;
    
    db.saveConsumption({
      id: Math.random().toString(36).substr(2, 9),
      agreementId: agreement.id,
      description: `Lançamento Diário: ${dailyQty} Marmitas Fixas`,
      amount: dailyQty * (agreement.fixedDailyPrice || 0),
      quantity: dailyQty,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    });
    
    alert("Lançamento realizado com sucesso!");
    setDailyQty(0);
    loadData();
  };

  const handleDeleteConsumption = async (id: string) => {
    if (window.confirm("Deseja estornar este lançamento de consumo?")) {
      await db.deleteConsumption(id);
      loadData();
    }
  };

  const handleClosePeriod = async () => {
    if (!invAgreement || !invStart || !invEnd) return;
    try {
      await db.closeAgreementPeriod(invAgreement, invStart, invEnd);
      alert("Fatura gerada com sucesso!");
      setInvAgreement('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar fatura');
    }
  };

  const pendingConsumptions = useMemo(() => {
    return consumptions.filter(c => c.status === 'PENDING').reverse();
  }, [consumptions]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Convênios Empresariais</h2>
          <p className="text-gray-500 font-medium">Gestão de faturamento mensal e marmitas corporativas.</p>
        </div>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl">
          <SubTab active={tab === 'companies'} onClick={() => setTab('companies')} icon={<Building2 size={18} />} label="Empresas" />
          <SubTab active={tab === 'employees'} onClick={() => setTab('employees')} icon={<Users size={18} />} label="Funcionários" />
          <SubTab active={tab === 'daily'} onClick={() => setTab('daily')} icon={<Calendar size={18} />} label="Marmitas Fixas" />
          <SubTab active={tab === 'invoices'} onClick={() => setTab('invoices')} icon={<Receipt size={18} />} label="Faturas" />
        </div>
      </header>

      {tab === 'companies' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={() => { setEditingCompany(null); setIsModalOpen(true); }} className="bg-orange-500 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-orange-100"><Plus /> Nova Empresa</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agreements.map(a => (
              <div key={a.id} className="bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all space-y-4">
                <div className="flex justify-between items-start">
                   <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Building2 /></div>
                   <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${a.type === AgreementType.FIXED_DAILY ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>{a.type === AgreementType.FIXED_DAILY ? 'FIXA' : 'INDIVIDUAL'}</span>
                </div>
                <div>
                  <h3 className="font-black text-gray-800 text-lg uppercase truncate">{a.tradeName}</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase">{a.taxId}</p>
                </div>
                <div className="pt-4 border-t grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Fechamento</p>
                    <p className="font-black text-gray-800">Dia {a.closingDay}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Vencimento</p>
                    <p className="font-black text-gray-800">Dia {a.dueDay}</p>
                  </div>
                </div>
                <button onClick={() => { setEditingCompany(a); setIsModalOpen(true); }} className="w-full py-2 bg-gray-50 rounded-xl text-xs font-black text-gray-500 uppercase tracking-widest hover:bg-orange-50 hover:text-orange-600 transition-all">Configurar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'employees' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={() => { setEditingEmployee(null); setIsModalOpen(true); }} className="bg-orange-500 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-orange-100"><Plus /> Novo Funcionário</button>
          </div>
          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Funcionário</th>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Matrícula</th>
                  <th className="px-6 py-4 text-center">Coparticipação</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employees.map(e => {
                  const comp = agreements.find(a => a.id === e.agreementId);
                  return (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-800 uppercase text-xs">{e.name}</td>
                      <td className="px-6 py-4 text-xs font-bold text-blue-600 uppercase">{comp?.tradeName || 'N/A'}</td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-400">#{e.registration || '---'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-2 py-1 rounded-lg">F: {e.employeeContributionPercent}% | E: {e.companyContributionPercent}%</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => { setEditingEmployee(e); setIsModalOpen(true); }} className="p-2 text-gray-300 hover:text-orange-500 transition-all"><Plus size={18} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'daily' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white p-10 rounded-[2.5rem] border shadow-xl space-y-8 animate-in slide-in-from-left-4">
             <h3 className="text-xl font-black text-gray-800 flex items-center gap-3"><Calendar className="text-orange-500" /> Lançamento Diário</h3>
             <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selecione a Empresa (Modo Fixo)</label>
                  <select className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none border-none font-bold" value={dailyAgreement} onChange={e => setDailyAgreement(e.target.value)}>
                    <option value="">Escolher empresa...</option>
                    {agreements.filter(a => a.type === AgreementType.FIXED_DAILY).map(a => <option key={a.id} value={a.id}>{a.tradeName} (Padrão: {a.fixedDailyQty}un)</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantidade a Lançar Hoje</label>
                  <input type="number" className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none border-none font-black text-2xl" value={dailyQty || ''} onChange={e => setDailyQty(Number(e.target.value))} />
                </div>
                <button onClick={handleDailyLaunch} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-100 hover:bg-orange-600 transition-all">Registrar Hoje</button>
             </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col h-full">
             <div className="p-8 border-b bg-gray-50/50 flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2"><History size={18} className="text-orange-500" /> Extrato Diário Recente</h3>
             </div>
             <div className="divide-y overflow-y-auto max-h-[400px]">
                {pendingConsumptions.filter(c => c.description.includes('Marmitas Fixas')).length === 0 ? (
                  <div className="p-12 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">Nenhum lançamento pendente.</div>
                ) : (
                  pendingConsumptions.filter(c => c.description.includes('Marmitas Fixas')).map(c => {
                    const comp = agreements.find(a => a.id === c.agreementId);
                    return (
                      <div key={c.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-lg uppercase">{new Date(c.timestamp).toLocaleDateString()}</div>
                           <div>
                              <p className="font-black text-gray-800 uppercase text-xs">{comp?.tradeName}</p>
                              <p className="text-[10px] text-gray-400 font-bold">{c.quantity} un - R$ {c.amount.toFixed(2)}</p>
                           </div>
                        </div>
                        <button onClick={() => handleDeleteConsumption(c.id)} className="p-2 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                      </div>
                    )
                  })
                )}
             </div>
          </div>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-2"><Filter /> Fechamento</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Empresa</label>
                  <select className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none font-bold text-sm" value={invAgreement} onChange={e => setInvAgreement(e.target.value)}>
                    <option value="">Selecionar...</option>
                    {agreements.map(a => <option key={a.id} value={a.id}>{a.tradeName}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">De</label>
                    <input type="date" className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-sm" value={invStart} onChange={e => setInvStart(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Até</label>
                    <input type="date" className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-sm" value={invEnd} onChange={e => setInvEnd(e.target.value)} />
                  </div>
                </div>
                <button onClick={handleClosePeriod} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all">Fechar e Faturar</button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
               <div className="p-6 border-b bg-gray-50/50 flex items-center justify-between">
                 <h3 className="font-black text-gray-800 uppercase text-[10px] tracking-widest flex items-center gap-2"><History size={16} /> Consumos Pendentes</h3>
               </div>
               <div className="divide-y overflow-y-auto max-h-[300px]">
                  {pendingConsumptions.length === 0 ? (
                    <div className="p-8 text-center text-gray-300 font-black uppercase text-[9px]">Tudo faturado!</div>
                  ) : (
                    pendingConsumptions.slice(0, 10).map(c => {
                      const comp = agreements.find(a => a.id === c.agreementId);
                      return (
                        <div key={c.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                           <div className="overflow-hidden">
                              <p className="font-black text-gray-800 text-[10px] uppercase truncate">{comp?.tradeName}</p>
                              <p className="text-[9px] text-gray-400 font-bold">{new Date(c.timestamp).toLocaleDateString()} - R$ {c.amount.toFixed(2)}</p>
                           </div>
                           <button onClick={() => handleDeleteConsumption(c.id)} className="text-gray-200 hover:text-red-500 transition-colors"><X size={14}/></button>
                        </div>
                      )
                    })
                  )}
               </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col">
             <div className="p-6 border-b bg-gray-50/50 flex items-center justify-between">
               <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest flex items-center gap-2"><FileText size={16} /> Últimas Faturas Geradas</h3>
             </div>
             <div className="divide-y overflow-y-auto flex-1">
               {invoices.length === 0 ? (
                 <div className="p-20 text-center text-gray-300 font-black uppercase text-xs tracking-widest">Nenhuma fatura emitida.</div>
               ) : (
                 invoices.reverse().map(inv => {
                   const comp = agreements.find(a => a.id === inv.agreementId);
                   return (
                     <div key={inv.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Receipt /></div>
                          <div>
                            <p className="font-black text-gray-800 uppercase text-sm">{comp?.tradeName}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Ref: {new Date(inv.periodStart).toLocaleDateString()} - {new Date(inv.periodEnd).toLocaleDateString()}</p>
                          </div>
                       </div>
                       <div className="text-right flex items-center gap-6">
                          <div>
                             <p className="text-lg font-black text-gray-800">R$ {inv.totalAmount.toFixed(2)}</p>
                             <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Venc: {new Date(inv.dueDate).toLocaleDateString()}</p>
                          </div>
                          <button className="p-3 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all" title="Gerar PDF"><Download size={20} /></button>
                       </div>
                     </div>
                   );
                 })
                )}
             </div>
          </div>
        </div>
      )}

      {isModalOpen && tab === 'companies' && (
        <Modal onClose={() => setIsModalOpen(false)} title={editingCompany ? 'Editar Convênio' : 'Novo Convênio'}>
          <form onSubmit={handleSaveCompany} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8">
             <div className="space-y-4">
                <input name="taxId" defaultValue={editingCompany?.taxId} placeholder="CNPJ" className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold" required />
                <input name="tradeName" defaultValue={editingCompany?.tradeName} placeholder="Nome Fantasia" className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold" required />
                <input name="companyName" defaultValue={editingCompany?.companyName} placeholder="Razão Social" className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold" />
                <input name="responsible" defaultValue={editingCompany?.responsible} placeholder="Responsável" className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold" />
                <input name="phone" defaultValue={editingCompany?.phone} placeholder="Telefone" className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold" />
                <input name="email" defaultValue={editingCompany?.email} placeholder="E-mail Corporativo" className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold" />
             </div>
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                   <input name="closingDay" type="number" defaultValue={editingCompany?.closingDay} placeholder="Dia Fechamento" className="px-4 py-3 bg-gray-50 rounded-xl font-bold" />
                   <input name="dueDay" type="number" defaultValue={editingCompany?.dueDay} placeholder="Dia Vencimento" className="px-4 py-3 bg-gray-50 rounded-xl font-bold" />
                </div>
                <input name="creditLimit" type="number" defaultValue={editingCompany?.creditLimit} placeholder="Limite de Crédito R$" className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold" />
                <select name="type" defaultValue={editingCompany?.type || AgreementType.INDIVIDUAL_CONSUMPTION} className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold">
                   <option value={AgreementType.INDIVIDUAL_CONSUMPTION}>Consumo por Funcionário</option>
                   <option value={AgreementType.FIXED_DAILY}>Marmita Fixa Diária</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                   <input name="fixedDailyQty" type="number" defaultValue={editingCompany?.fixedDailyQty} placeholder="Qtd Diária Padrão" className="px-4 py-3 bg-gray-50 rounded-xl font-bold" />
                   <input name="fixedDailyPrice" type="number" step="0.01" defaultValue={editingCompany?.fixedDailyPrice} placeholder="Valor Unitário R$" className="px-4 py-3 bg-gray-50 rounded-xl font-bold" />
                </div>
                <button type="submit" className="w-full bg-orange-500 text-white py-4 rounded-xl font-black shadow-lg shadow-orange-100">Salvar Convênio</button>
             </div>
          </form>
        </Modal>
      )}

      {isModalOpen && tab === 'employees' && (
        <Modal onClose={() => setIsModalOpen(false)} title={editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}>
          <form onSubmit={handleSaveEmployee} className="p-8 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select name="agreementId" defaultValue={editingEmployee?.agreementId} className="px-4 py-3 bg-gray-50 rounded-xl font-bold" required>
                   <option value="">Selecione a Empresa</option>
                   {agreements.map(a => <option key={a.id} value={a.id}>{a.tradeName}</option>)}
                </select>
                <input name="registration" defaultValue={editingEmployee?.registration} placeholder="Matrícula" className="px-4 py-3 bg-gray-50 rounded-xl font-bold" />
                <input name="name" defaultValue={editingEmployee?.name} placeholder="Nome Completo" className="md:col-span-2 px-4 py-3 bg-gray-50 rounded-xl font-bold" required />
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase">Pago pela Empresa (%)</label>
                   <input name="companyContrib" type="number" defaultValue={editingEmployee?.companyContributionPercent || 100} className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase">Pago pelo Funcionário (%)</label>
                   <input name="employeeContrib" type="number" defaultValue={editingEmployee?.employeeContributionPercent || 0} className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold" />
                </div>
             </div>
             <button type="submit" className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black shadow-lg">Cadastrar Colaborador</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

const SubTab = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`px-5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 text-sm ${active ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
    {icon} {label}
  </button>
);

const Modal = ({ onClose, title, children }: any) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden">
      <header className="p-8 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="text-xl font-black text-gray-800">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors"><X /></button>
      </header>
      {children}
    </div>
  </div>
);

export default Agreements;
