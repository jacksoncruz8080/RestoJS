
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../services/db';
import { Product, SaleItem, Sale, User, CashSession, CorporateAgreement, CorporateEmployee, AgreementType } from '../types';
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, QrCode, Printer, X, Scale, Save, List, Eye, AlertTriangle, Building2, User as UserIcon } from 'lucide-react';
import Receipt from './Receipt';

interface POSProps {
  currentUser: User;
  currentSession: CashSession | undefined;
}

const POS: React.FC<POSProps> = ({ currentUser, currentSession }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CREDIT' | 'DEBIT' | 'PIX' | 'AGREEMENT' | null>(null);
  
  // Agreement Selection
  const [agreements, setAgreements] = useState<CorporateAgreement[]>([]);
  const [selectedAgreement, setSelectedAgreement] = useState<CorporateAgreement | null>(null);
  const [employees, setEmployees] = useState<CorporateEmployee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<CorporateEmployee | null>(null);
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  const [isFinishing, setIsFinishing] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [weightModal, setWeightModal] = useState<{ product: Product, weight: string } | null>(null);
  const [openOrders, setOpenOrders] = useState<Sale[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [showOpenOrders, setShowOpenOrders] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [productsData, categoriesData, agreementsData] = await Promise.all([
        db.getProducts(),
        db.getCategories(),
        db.getAgreements()
      ]);
      setProducts(productsData.filter(p => p.active));
      setCategories(categoriesData);
      setAgreements(agreementsData.filter(a => a.active));
      loadOpenOrders();
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadEmployees = async () => {
      if (selectedAgreement) {
        const employeesData = await db.getEmployees(selectedAgreement.id);
        setEmployees(employeesData.filter(e => e.active));
      } else {
        setEmployees([]);
      }
    };
    loadEmployees();
  }, [selectedAgreement]);

  const loadOpenOrders = async () => {
    const salesData = await db.getSales();
    setOpenOrders(salesData.filter(s => s.status === 'OPEN'));
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      (selectedCategory === 'Todos' || p.category === selectedCategory) &&
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.includes(searchTerm))
    );
  }, [products, searchTerm, selectedCategory]);

  const subtotal = useMemo(() => cart.reduce((acc, curr) => acc + curr.total, 0), [cart]);
  const total = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount]);

  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.unit === 'KG' && !weightModal) {
      setWeightModal({ product, weight: '' });
      return;
    }
    const qty = quantity;
    const existingIndex = product.unit === 'UN' ? cart.findIndex(item => item.productId === product.id) : -1;
    if (existingIndex > -1) {
      const newCart = [...cart];
      const item = newCart[existingIndex];
      item.quantity += qty;
      item.total = item.quantity * item.price;
      setCart(newCart);
    } else {
      const newItem: SaleItem = {
        id: Math.random().toString(36).substr(2, 9),
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: qty,
        unit: product.unit,
        total: product.price * qty
      };
      setCart([...cart, newItem]);
    }
    setWeightModal(null);
  };

  const updateQuantity = (cartItemId: string, qty: number) => {
    if (qty <= 0) { removeFromCart(cartItemId); return; }
    setCart(cart.map(item => item.id === cartItemId ? { ...item, quantity: qty, total: item.price * qty } : item));
  };

  const removeFromCart = (cartItemId: string) => setCart(cart.filter(item => item.id !== cartItemId));

  const handleSaveOrder = async () => {
    if (cart.length === 0) return;
    const allSales = await db.getSales();
    const sale: Sale = {
      id: activeOrderId || Math.random().toString(36).substr(2, 9),
      orderNumber: activeOrderId ? openOrders.find(o => o.id === activeOrderId)?.orderNumber || '' : (allSales.length + 1).toString().padStart(6, '0'),
      customerName: customerName || 'Balcão',
      items: cart,
      subtotal,
      discount,
      total,
      timestamp: new Date().toISOString(),
      status: 'OPEN',
      operatorId: currentUser.id
    };
    await db.saveSale(sale);
    setLastSale(sale);
    setIsFinishing(true);
    resetForm();
    loadOpenOrders();
  };

  const finalizeSale = async () => {
    if (!currentSession || cart.length === 0 || !paymentMethod) return;

    if (paymentMethod === 'AGREEMENT' && !selectedAgreement) {
      setShowAgreementModal(true);
      return;
    }

    const allSales = await db.getSales();
    const sale: Sale = {
      id: activeOrderId || Math.random().toString(36).substr(2, 9),
      orderNumber: activeOrderId ? openOrders.find(o => o.id === activeOrderId)?.orderNumber || '' : (allSales.length + 1).toString().padStart(6, '0'),
      customerName: selectedAgreement ? selectedAgreement.tradeName : customerName,
      items: cart,
      subtotal,
      discount,
      total,
      paymentMethod,
      agreementId: selectedAgreement?.id,
      employeeId: selectedEmployee?.id,
      timestamp: new Date().toISOString(),
      status: 'COMPLETED',
      operatorId: currentUser.id
    };

    await db.saveSale(sale);
    setLastSale(sale);
    setIsFinishing(true);
    resetForm();
    loadOpenOrders();
  };

  const resetForm = () => {
    setCart([]);
    setDiscount(0);
    setPaymentMethod(null);
    setActiveOrderId(null);
    setCustomerName('');
    setSelectedAgreement(null);
    setSelectedEmployee(null);
  };

  const resumeOrder = (order: Sale) => {
    setCart(order.items);
    setActiveOrderId(order.id);
    setCustomerName(order.customerName || '');
    setDiscount(order.discount);
    setShowOpenOrders(false);
  };

  const handlePrint = () => {
    window.print();
    setIsFinishing(false);
    setLastSale(null);
  };

  return (
    <div className="flex h-screen overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => setShowOpenOrders(true)} className="fixed bottom-6 left-6 z-40 bg-orange-600 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 hover:scale-105 transition-all no-print">
        <List size={24} />
        <span className="font-bold hidden sm:block">{openOrders.length} Comandas</span>
      </button>

      <div className="flex-1 flex flex-col border-r bg-white no-print min-w-0">
        <header className="p-4 border-b space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Pesquisar produto..." className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="w-full sm:w-64 relative">
               <input type="text" placeholder="Mesa / Comanda" className="w-full px-4 py-3 bg-orange-50 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-black text-orange-800 placeholder:text-orange-200" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={() => setSelectedCategory('Todos')} className={`px-5 py-2.5 rounded-full whitespace-nowrap text-xs font-black uppercase tracking-widest transition-all ${selectedCategory === 'Todos' ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>Todos</button>
            {categories.map(cat => <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2.5 rounded-full whitespace-nowrap text-xs font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{cat}</button>)}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 bg-gray-50/50 content-start">
          {filteredProducts.map(product => (
            <button key={product.id} onClick={() => addToCart(product)} className="flex flex-col text-left bg-white rounded-3xl overflow-hidden border shadow-sm hover:shadow-xl hover:border-orange-500 transition-all group relative h-fit">
              <div className="h-32 sm:h-40 bg-gray-200 relative overflow-hidden shrink-0">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white text-[10px] sm:text-xs px-3 py-1.5 rounded-xl font-black">R$ {product.price.toFixed(2)}</div>
                {product.unit === 'KG' && <div className="absolute top-3 left-3 bg-blue-600 text-white p-1.5 rounded-xl shadow-lg"><Scale size={16} /></div>}
              </div>
              <div className="p-4 flex flex-col justify-between">
                <h3 className="font-bold text-gray-800 text-xs sm:text-sm h-8 sm:h-10 line-clamp-2 leading-tight uppercase tracking-tight">{product.name}</h3>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[8px] sm:text-[9px] text-orange-500 font-black uppercase tracking-widest truncate max-w-[60px]">{product.category}</span>
                  <span className="text-[8px] sm:text-[9px] px-2 py-1 rounded-lg font-black bg-gray-100 text-gray-400 uppercase">{product.unit}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="md:w-80 lg:w-96 flex flex-col bg-white no-print border-l shrink-0 transition-all duration-300">
        {!currentSession && (
          <div className="bg-red-600 text-white p-5 flex items-center gap-4 animate-pulse shrink-0 shadow-lg">
            <AlertTriangle size={28} className="shrink-0" />
            <div className="leading-tight overflow-hidden">
              <p className="font-black text-sm uppercase tracking-widest">Atenção: Caixa Fechado</p>
              <p className="text-[11px] opacity-90 font-bold">Abra o caixa no menu lateral para vender.</p>
            </div>
          </div>
        )}

        <header className="p-4 sm:p-6 border-b flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3 font-black text-gray-800 uppercase tracking-widest text-[10px] sm:text-xs overflow-hidden">
            <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg shadow-orange-100 shrink-0"><ShoppingCart size={16} /></div>
            <span className="truncate">Carrinho {activeOrderId && <span className="text-orange-500">(#{activeOrderId.slice(-4)})</span>}</span>
          </div>
          <button onClick={resetForm} className="p-2 text-gray-300 hover:text-red-500 transition-colors bg-white rounded-xl shadow-sm border shrink-0"><Trash2 size={18} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 text-center p-8">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4"><ShoppingCart size={32} className="opacity-20" /></div>
              <p className="font-black uppercase text-[10px] tracking-[0.2em]">Carrinho Vazio</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-white p-3 rounded-[1.2rem] border hover:border-orange-200 transition-all shadow-sm">
                <div className="flex-1 min-w-0">
                  <h4 className="text-[10px] font-black text-gray-800 truncate uppercase tracking-tight">{item.name}</h4>
                  <p className="text-xs text-orange-600 font-black">R$ {item.total.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" step={item.unit === 'KG' ? '0.001' : '1'} value={item.quantity} onChange={(e) => updateQuantity(item.id, parseFloat(e.target.value) || 0)} className="w-12 sm:w-16 px-1 py-2 text-center bg-gray-50 border-none rounded-xl text-xs sm:text-sm font-black outline-none" />
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-gray-200 hover:text-red-500 transition-colors shrink-0"><Trash2 size={16} /></button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 sm:p-6 border-t space-y-4 bg-gray-50/80">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-gray-400 text-[10px] font-black uppercase tracking-widest"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
            <div className="flex items-center justify-between text-gray-400 text-[10px] font-black uppercase tracking-widest">
              <span>Desconto</span>
              <div className="flex items-center gap-1"><span className="text-red-500">- R$</span><input type="number" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))} placeholder="0,00" className="w-12 sm:w-16 text-right bg-transparent border-b border-red-100 outline-none font-black text-red-500 text-xs sm:text-sm" /></div>
            </div>
            {selectedAgreement && (
              <div className="flex items-center justify-between text-blue-500 text-[10px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-1"><Building2 size={12} /> {selectedAgreement.tradeName}</span>
                <span>{selectedEmployee?.name || 'Venda Empresa'}</span>
              </div>
            )}
          </div>
          <div className="pt-3 border-t-2 border-dashed border-gray-200 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
            <span className="text-2xl lg:text-3xl font-black text-gray-800 tracking-tighter">R$ {total.toFixed(2)}</span>
          </div>
          <div className="space-y-2">
             <div className={`grid grid-cols-5 gap-1 transition-opacity ${!currentSession ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
               <PaymentButton active={paymentMethod === 'CASH'} onClick={() => setPaymentMethod('CASH')} icon={<Banknote size={14} />} label="Din" />
               <PaymentButton active={paymentMethod === 'CREDIT'} onClick={() => setPaymentMethod('CREDIT')} icon={<CreditCard size={14} />} label="Créd" />
               <PaymentButton active={paymentMethod === 'DEBIT'} onClick={() => setPaymentMethod('DEBIT')} icon={<CreditCard size={14} />} label="Déb" />
               <PaymentButton active={paymentMethod === 'PIX'} onClick={() => setPaymentMethod('PIX')} icon={<QrCode size={14} />} label="PIX" />
               <PaymentButton active={paymentMethod === 'AGREEMENT'} onClick={() => setShowAgreementModal(true)} icon={<Building2 size={14} />} label="Conv" />
             </div>
             <button disabled={cart.length === 0 || !paymentMethod || !currentSession} onClick={finalizeSale} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white font-black py-4 lg:py-5 rounded-2xl sm:rounded-3xl shadow-2xl transition-all flex items-center justify-center gap-3 uppercase text-[10px] sm:text-xs tracking-widest"><ShoppingCart size={18} />Finalizar Venda</button>
             <button onClick={handleSaveOrder} disabled={cart.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 text-white font-black py-3 sm:py-4 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase text-[9px] sm:text-[10px] tracking-widest"><Save size={16} />Guardar Comanda</button>
          </div>
        </div>
      </div>

      {/* Modal de Convênio */}
      {showAgreementModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
             <header className="p-8 border-b flex justify-between items-center bg-blue-50">
                <h3 className="text-xl font-black flex items-center gap-3 text-blue-900 tracking-tight"><Building2 /> SELECIONAR CONVÊNIO</h3>
                <button onClick={() => setShowAgreementModal(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X /></button>
             </header>
             <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Empresa Conveniada</label>
                  <div className="grid grid-cols-1 gap-2">
                    {agreements.map(a => (
                      <button 
                        key={a.id} 
                        onClick={() => { setSelectedAgreement(a); setPaymentMethod('AGREEMENT'); if (a.type === AgreementType.FIXED_DAILY) setShowAgreementModal(false); }}
                        className={`p-4 rounded-2xl text-left border-2 transition-all ${selectedAgreement?.id === a.id ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-gray-100 hover:border-blue-200'}`}
                      >
                        <div className="font-black uppercase text-sm">{a.tradeName}</div>
                        <div className="text-[10px] font-bold opacity-60">
                          {a.type === AgreementType.FIXED_DAILY ? 'MARMITA FIXA' : 'CONSUMO INDIVIDUAL'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedAgreement?.type === AgreementType.INDIVIDUAL_CONSUMPTION && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Funcionário / Colaborador</label>
                    <div className="grid grid-cols-2 gap-2">
                      {employees.map(e => (
                        <button 
                          key={e.id} 
                          onClick={() => { setSelectedEmployee(e); setShowAgreementModal(false); }}
                          className={`p-3 rounded-xl text-left border-2 transition-all ${selectedEmployee?.id === e.id ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-gray-100 hover:border-blue-200'}`}
                        >
                          <div className="font-bold text-xs truncate">{e.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Modal de Comandas em Aberto */}
      {showOpenOrders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
             <header className="p-8 border-b flex justify-between items-center bg-orange-50">
                <h3 className="text-xl font-black flex items-center gap-3 tracking-tight"><List className="text-orange-600" /> COMANDAS EM ABERTO</h3>
                <button onClick={() => setShowOpenOrders(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X /></button>
             </header>
             <div className="p-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {openOrders.length === 0 ? (
                    <div className="col-span-2 text-center py-20 text-gray-300 font-black uppercase text-xs tracking-widest">Nenhuma comanda ativa no momento.</div>
                  ) : (
                    openOrders.map(order => (
                      <button 
                        key={order.id}
                        onClick={() => resumeOrder(order)}
                        className="flex flex-col text-left p-6 bg-gray-50 border rounded-3xl hover:border-orange-500 transition-all hover:bg-white group"
                      >
                         <div className="flex justify-between items-start mb-3">
                            <span className="font-black text-orange-600 text-sm tracking-widest">#{order.orderNumber}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">{new Date(order.timestamp).toLocaleTimeString()}</span>
                         </div>
                         <h4 className="font-black text-gray-800 mb-1 uppercase tracking-tight">{order.customerName || 'Balcão'}</h4>
                         <p className="text-xs text-gray-400 font-bold mb-4">{order.items.length} ITENS</p>
                         <div className="mt-auto pt-4 border-t border-dashed w-full flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-300 group-hover:text-orange-500 uppercase tracking-widest">Retomar</span>
                            <span className="text-xl font-black text-gray-800 tracking-tighter">R$ {order.total.toFixed(2)}</span>
                         </div>
                      </button>
                    ))
                  )}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Modal de Peso da Balança */}
      {weightModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-10 text-center space-y-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <Scale size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">{weightModal.product.name}</h3>
                <p className="text-xs text-gray-400 font-bold uppercase mt-1">Informe o peso da balança</p>
              </div>
              <div className="relative">
                <input autoFocus type="number" step="0.001" placeholder="0,000"
                  className="w-full text-center py-6 bg-gray-50 rounded-2xl text-4xl font-black outline-none border-2 border-transparent focus:border-blue-500 transition-all text-gray-800"
                  value={weightModal.weight}
                  onChange={(e) => setWeightModal({ ...weightModal, weight: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && weightModal.weight && addToCart(weightModal.product, parseFloat(weightModal.weight))}
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-gray-300">KG</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setWeightModal(null)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500">Cancelar</button>
                <button onClick={() => addToCart(weightModal.product, parseFloat(weightModal.weight))} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Finalização / Sucesso */}
      {isFinishing && lastSale && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
             <div className="p-10 text-center space-y-6">
                <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-lg ${lastSale.status === 'OPEN' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {lastSale.status === 'OPEN' ? <Save size={40} /> : <Ticket size={40} />}
                </div>
                <h3 className="text-2xl font-black tracking-tight">{lastSale.status === 'OPEN' ? 'PEDIDO SALVO!' : 'VENDA CONCLUÍDA!'}</h3>
                <div className="grid grid-cols-1 gap-3 pt-6">
                  <button onClick={() => setShowReceiptPreview(true)} className="w-full bg-gray-50 text-gray-800 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 border hover:bg-white transition-all"><Eye size={18} /> Ver Cupom</button>
                  <button onClick={handlePrint} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-orange-600 transition-all"><Printer size={20} /> Imprimir</button>
                  <button onClick={() => { setIsFinishing(false); setLastSale(null); }} className="w-full py-4 text-gray-400 font-black text-[10px] uppercase tracking-[0.3em] hover:text-gray-600 transition-colors">Fechar</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Modal de Pré-visualização do Cupom */}
      {showReceiptPreview && lastSale && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 no-print">
          <div className="bg-gray-800 rounded-[2rem] w-full max-w-sm overflow-hidden flex flex-col shadow-2xl border border-gray-700 animate-in fade-in zoom-in-95">
            <header className="p-6 border-b border-gray-700 flex justify-between items-center text-white">
              <span className="font-black uppercase text-xs tracking-widest">Pré-visualização</span>
              <button onClick={() => setShowReceiptPreview(false)} className="p-2 hover:bg-gray-700 rounded-full transition-colors"><X size={20} /></button>
            </header>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-900 scrollbar-hide">
               <Receipt sale={lastSale} className="rounded-xl" />
            </div>
            <footer className="p-6 bg-gray-800 border-t border-gray-700 flex gap-3">
              <button 
                onClick={() => { window.print(); setShowReceiptPreview(false); setIsFinishing(false); setLastSale(null); }} 
                className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-orange-900"
              >
                <Printer size={18} /> Imprimir
              </button>
              <button 
                onClick={() => setShowReceiptPreview(false)} 
                className="px-8 py-4 bg-gray-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest"
              >
                Sair
              </button>
            </footer>
          </div>
        </div>
      )}

      {lastSale && (
        <div className="print-only">
          <Receipt id="print-receipt" sale={lastSale} />
        </div>
      )}
    </div>
  );
};

const PaymentButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border-2 transition-all ${active ? 'border-orange-500 bg-white text-orange-600 shadow-md' : 'border-gray-100 bg-gray-50 text-gray-400 hover:bg-white hover:border-gray-200'}`}>
    {icon}
    <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

const Ticket = ({ size }: any) => <QrCode size={size} />;

export default POS;
