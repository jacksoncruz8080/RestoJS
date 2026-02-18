
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Sale } from '../types';
import { Search, Filter, Printer, XCircle, Info, Calendar, Eye, X } from 'lucide-react';
import Receipt from './Receipt';

const History: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'COMPLETED' | 'CANCELLED' | 'OPEN'>('ALL');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const loadSales = async () => {
      const data = await db.getSales();
      setSales(data);
    };
    loadSales();
  }, []);

  const filteredSales = sales.filter(s => {
    const matchesSearch = s.orderNumber.includes(searchTerm) || (s.customerName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  }).reverse();

  const handleCancel = async (id: string) => {
    if (window.confirm("Deseja realmente CANCELAR esta venda? O estoque será devolvido.")) {
      await db.cancelSale(id);
      const updatedSales = await db.getSales();
      setSales(updatedSales);
    }
  };

  const handlePrint = (sale: Sale) => {
    setSelectedSale(sale);
    setTimeout(() => window.print(), 100);
  };

  const handlePreview = (sale: Sale) => {
    setSelectedSale(sale);
    setShowPreview(true);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 no-print">
      <header>
        <h2 className="text-3xl font-bold text-gray-800">Histórico de Movimentações</h2>
        <p className="text-gray-500">Consulte comandas abertas, finalizadas e canceladas.</p>
      </header>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar por Nº Pedido ou Cliente..." 
              className="w-full pl-10 pr-4 py-2 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <FilterButton active={filterStatus === 'ALL'} onClick={() => setFilterStatus('ALL')} label="Todos" color="gray" />
            <FilterButton active={filterStatus === 'OPEN'} onClick={() => setFilterStatus('OPEN')} label="Abertas" color="blue" />
            <FilterButton active={filterStatus === 'COMPLETED'} onClick={() => setFilterStatus('COMPLETED')} label="Finalizados" color="green" />
            <FilterButton active={filterStatus === 'CANCELLED'} onClick={() => setFilterStatus('CANCELLED')} label="Cancelados" color="red" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                <th className="px-6 py-4">Pedido</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Data/Hora</th>
                <th className="px-6 py-4">Valor Total</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-800">#{sale.orderNumber}</td>
                  <td className="px-6 py-4 font-medium text-gray-700">{sale.customerName || 'Balcão'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      {new Date(sale.timestamp).toLocaleString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-800">
                    R$ {sale.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={sale.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handlePreview(sale)} className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all" title="Ver na Tela">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => handlePrint(sale)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Imprimir">
                        <Printer size={18} />
                      </button>
                      {sale.status === 'COMPLETED' && (
                        <button onClick={() => handleCancel(sale.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Cancelar Venda">
                          <XCircle size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPreview && selectedSale && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 no-print">
          <div className="bg-gray-800 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
            <header className="p-4 border-b border-gray-700 flex justify-between items-center text-white">
              <span className="font-bold">Visualização do Pedido</span>
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-700 rounded-full"><X size={20} /></button>
            </header>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-900 scrollbar-hide">
               <Receipt sale={selectedSale} />
            </div>
            <footer className="p-4 bg-gray-800 border-t border-gray-700 flex gap-3">
              <button 
                onClick={() => { window.print(); setShowPreview(false); }} 
                className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Printer size={18} /> Imprimir
              </button>
              <button 
                onClick={() => setShowPreview(false)} 
                className="px-6 py-3 bg-gray-700 text-white rounded-xl font-bold"
              >
                Fechar
              </button>
            </footer>
          </div>
        </div>
      )}

      {selectedSale && (
        <div className="Print-only">
          <Receipt id="print-receipt" sale={selectedSale} />
        </div>
      )}
    </div>
  );
};

const FilterButton = ({ active, onClick, label, color }: any) => {
  const colors: any = {
    blue: active ? 'bg-blue-500 text-white' : 'bg-white border text-blue-500',
    green: active ? 'bg-green-500 text-white' : 'bg-white border text-green-500',
    red: active ? 'bg-red-500 text-white' : 'bg-white border text-red-500',
    gray: active ? 'bg-gray-600 text-white' : 'bg-white border text-gray-500'
  };
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${colors[color]}`}>
      {label}
    </button>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const configs: any = {
    OPEN: 'bg-blue-100 text-blue-700 border-blue-200',
    COMPLETED: 'bg-green-100 text-green-700 border-green-200',
    CANCELLED: 'bg-red-100 text-red-700 border-red-200'
  };
  const labels: any = { OPEN: 'Aberta', COMPLETED: 'Concluída', CANCELLED: 'Cancelada' };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${configs[status]}`}>
      {labels[status]}
    </span>
  );
};

export default History;
