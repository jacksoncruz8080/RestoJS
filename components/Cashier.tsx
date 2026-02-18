
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../services/db';
import { CashSession, CashMovement, User, Sale } from '../types';
import { Wallet, LogIn, LogOut, ArrowUpCircle, ArrowDownCircle, History, DollarSign, Calculator, RefreshCw } from 'lucide-react';

interface CashierProps {
  currentUser: User;
  currentSession: CashSession | undefined;
  refreshSession: () => void;
}

const Cashier: React.FC<CashierProps> = ({ currentUser, currentSession, refreshSession }) => {
  const [initialBalance, setInitialBalance] = useState('');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementDesc, setMovementDesc] = useState('');
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [history, setHistory] = useState<CashSession[]>([]);
  const [salesInSession, setSalesInSession] = useState<Sale[]>([]);

  // Função para carregar todos os dados dependentes da sessão atual
  const loadSessionData = useCallback(async () => {
    if (currentSession) {
      const [movementsData, allSales, sessionsData] = await Promise.all([
        db.getMovements(currentSession.id),
        db.getSales(),
        db.getCashSessions()
      ]);
      setMovements(movementsData);
      const sessionSales = allSales.filter(s => s.status === 'COMPLETED' && s.timestamp >= currentSession.openedAt);
      setSalesInSession(sessionSales);
      setHistory(sessionsData.sort((a, b) => b.openedAt.localeCompare(a.openedAt)));
    } else {
      const sessionsData = await db.getCashSessions();
      setHistory(sessionsData.sort((a, b) => b.openedAt.localeCompare(a.openedAt)));
    }
  }, [currentSession]);

  // Carrega dados ao montar o componente ou quando a sessão mudar
  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  const salesTotal = useMemo(() => {
    return salesInSession.reduce((acc, curr) => acc + curr.total, 0);
  }, [salesInSession]);

  const totalMovements = useMemo(() => {
    return movements.reduce((acc, curr) => {
      return curr.type === 'REFORCO' ? acc + curr.amount : acc - curr.amount;
    }, 0);
  }, [movements]);

  const estimatedBalance = useMemo(() => {
    if (!currentSession) return 0;
    return Number(currentSession.initialBalance) + salesTotal + totalMovements;
  }, [currentSession, salesTotal, totalMovements]);

  const handleOpen = async () => {
    const value = parseFloat(initialBalance);
    if (isNaN(value)) {
      alert("Por favor, informe um valor válido para abertura.");
      return;
    }
    const session: CashSession = {
      id: Math.random().toString(36).substr(2, 9),
      openedAt: new Date().toISOString(),
      initialBalance: value,
      totalSales: 0,
      operatorId: currentUser.id,
      status: 'OPEN'
    };
    await db.openCashier(session);
    refreshSession();
  };

  const handleClose = async () => {
    if (!currentSession) return;
    
    const confirmMessage = `CONFIRMAÇÃO DE FECHAMENTO\n\n` +
      `Saldo Inicial: R$ ${currentSession.initialBalance.toFixed(2)}\n` +
      `Vendas do Turno: R$ ${salesTotal.toFixed(2)}\n` +
      `Movimentações: R$ ${totalMovements.toFixed(2)}\n` +
      `------------------------------\n` +
      `SALDO ESTIMADO: R$ ${estimatedBalance.toFixed(2)}\n\n` +
      `Deseja encerrar este turno agora?`;

    if (window.confirm(confirmMessage)) {
      await db.closeCashier(currentSession.id, estimatedBalance);
      refreshSession();
      alert("Caixa fechado com sucesso!");
    }
  };

  const handleMovement = async (type: 'SANGRIA' | 'REFORCO') => {
    const amount = parseFloat(movementAmount);
    if (!currentSession || isNaN(amount) || amount <= 0) {
      alert("Informe um valor válido maior que zero.");
      return;
    }
    
    const m: CashMovement = {
      id: Math.random().toString(36).substr(2, 9),
      sessionId: currentSession.id,
      type,
      amount: amount,
      description: movementDesc || (type === 'REFORCO' ? 'Reforço manual' : 'Sangria manual'),
      timestamp: new Date().toISOString()
    };
    
    await db.addMovement(m);
    setMovementAmount('');
    setMovementDesc('');
    loadSessionData();
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Controle de Caixa</h2>
          <p className="text-gray-500">Gestão financeira e fechamento de turnos.</p>
        </div>
        {currentSession && (
          <button 
            onClick={loadSessionData}
            className="p-3 bg-white border rounded-xl text-gray-400 hover:text-orange-500 hover:border-orange-200 transition-all flex items-center gap-2 text-sm font-bold"
            title="Sincronizar dados"
          >
            <RefreshCw size={18} />
            Atualizar Dados
          </button>
        )}
      </header>

      {!currentSession ? (
        <div className="max-w-md mx-auto bg-white p-10 rounded-[2.5rem] border shadow-2xl text-center space-y-8 animate-in zoom-in-95">
          <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto rotate-3">
            <Wallet size={48} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-gray-800">Caixa Fechado</h3>
            <p className="text-gray-500 font-medium">Inicie um novo turno informando o valor inicial em dinheiro disponível na gaveta.</p>
          </div>
          <div className="relative">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-xl font-black">R$</span>
            <input 
              type="number" 
              placeholder="0,00" 
              className="w-full pl-16 pr-6 py-5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500 outline-none text-3xl font-black text-gray-800"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
            />
          </div>
          <button 
            onClick={handleOpen}
            className="w-full bg-orange-500 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-orange-600 transition-all shadow-xl shadow-orange-100 active:scale-95"
          >
            <LogIn size={24} />
            Abrir Caixa Agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SummaryCard label="Abertura" value={currentSession.initialBalance} />
              <SummaryCard label="Vendas (+)" value={salesTotal} color="text-emerald-600" />
              <SummaryCard label="Saldo Atual" value={estimatedBalance} color="text-orange-500" highlight />
            </div>

            <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
                <Calculator size={24} className="text-orange-500" />
                Movimentações Avulsas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                    <input 
                      type="number" 
                      placeholder="0,00" 
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500 outline-none font-black text-xl"
                      value={movementAmount}
                      onChange={(e) => setMovementAmount(e.target.value)}
                    />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Motivo da movimentação..." 
                    className="w-full px-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                    value={movementDesc}
                    onChange={(e) => setMovementDesc(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => handleMovement('REFORCO')}
                    className="flex-1 bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all p-4 shadow-lg shadow-emerald-50"
                  >
                    <ArrowUpCircle size={24} />
                    Entrada (Reforço)
                  </button>
                  <button 
                    onClick={() => handleMovement('SANGRIA')}
                    className="flex-1 bg-red-500 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-red-600 transition-all p-4 shadow-lg shadow-red-50"
                  >
                    <ArrowDownCircle size={24} />
                    Saída (Sangria)
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
               <div className="p-6 border-b bg-gray-50/50 flex items-center justify-between">
                 <div className="flex items-center gap-3 font-black text-gray-800">
                    <History size={20} className="text-orange-500" />
                    Histórico deste Turno
                 </div>
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{movements.length} Registros</span>
               </div>
               <div className="divide-y max-h-[400px] overflow-y-auto">
                 {movements.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 italic font-medium">Nenhuma sangria ou reforço registrado.</div>
                 ) : (
                    movements.slice().reverse().map(m => (
                      <div key={m.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${m.type === 'REFORCO' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {m.type === 'REFORCO' ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{m.description}</p>
                            <p className="text-xs text-gray-400 font-medium">{new Date(m.timestamp).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <p className={`text-lg font-black ${m.type === 'REFORCO' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {m.type === 'REFORCO' ? '+' : '-'} R$ {m.amount.toFixed(2)}
                        </p>
                      </div>
                    ))
                 )}
               </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-8 rounded-3xl border-2 border-orange-100 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-50 rounded-full blur-3xl opacity-50"></div>
              <div className="flex items-center justify-between relative">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Sessão em Curso</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <div className="space-y-3 relative">
                <p className="text-sm text-gray-500 flex justify-between">Operador: <b className="text-gray-800">{currentUser.name}</b></p>
                <p className="text-sm text-gray-500 flex justify-between">Início: <b className="text-gray-800">{new Date(currentSession.openedAt).toLocaleTimeString()}</b></p>
                <p className="text-sm text-gray-500 flex justify-between">Data: <b className="text-gray-800">{new Date(currentSession.openedAt).toLocaleDateString()}</b></p>
              </div>
              <div className="pt-4 border-t border-dashed">
                <button 
                  onClick={handleClose}
                  className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95"
                >
                  <LogOut size={24} />
                  Encerrar Turno
                </button>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border shadow-sm">
               <h4 className="font-black text-gray-800 mb-6 flex items-center gap-3">
                 <History size={20} className="text-orange-500" />
                 Turnos Anteriores
               </h4>
               <div className="space-y-4">
                 {history.filter(h => h.status === 'CLOSED').slice(0, 5).map(h => (
                   <div key={h.id} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between border border-transparent hover:border-gray-200 transition-all">
                     <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                        <div>
                          <p className="font-black text-gray-800 text-sm">{new Date(h.openedAt).toLocaleDateString()}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">FIM: {new Date(h.closedAt!).toLocaleTimeString()}</p>
                        </div>
                     </div>
                     <p className="font-black text-orange-600">R$ {h.finalBalance?.toFixed(2)}</p>
                   </div>
                 ))}
                 {history.filter(h => h.status === 'CLOSED').length === 0 && (
                   <p className="text-center text-gray-400 text-sm italic py-4">Nenhum histórico disponível.</p>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, color = "text-gray-800", highlight = false }: any) => (
  <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between h-32 transition-all ${highlight ? 'bg-orange-50/30 border-orange-100 shadow-orange-50' : 'bg-white'}`}>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
    <p className={`text-2xl font-black ${color}`}>R$ {value.toFixed(2)}</p>
  </div>
);

export default Cashier;
