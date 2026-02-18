import React, { useState, useEffect, useCallback } from 'react';
import { db } from './services/db';
import { User, UserRole, CashSession } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import History from './components/History';
import Cashier from './components/Cashier';
import Agreements from './components/Agreements';
import { ChefHat, Lock, User as UserIcon } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('pos');
  const [currentSession, setCurrentSession] = useState<CashSession | undefined>(undefined);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      await db.init();
      const storedUser = localStorage.getItem('restomaster_current_user');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
      refreshSession();
      setIsLoading(false);
    };
    initApp();
  }, []);

  const refreshSession = useCallback(async () => {
    const session = await db.getCurrentSession();
    setCurrentSession(session);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await db.login(loginForm.username, loginForm.password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('restomaster_current_user', JSON.stringify(user));
      setLoginError('');
      setActiveTab(user.role === UserRole.ADMIN ? 'dashboard' : 'pos');
    } else {
      setLoginError('Usuário ou senha incorretos');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('restomaster_current_user');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-orange-500 text-xl font-bold">Carregando...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-orange-500 p-12 text-center text-white space-y-4">
             <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto backdrop-blur-sm">
                <ChefHat size={48} />
             </div>
             <div>
                <h1 className="text-4xl font-black tracking-tight leading-none">JS Resto</h1>
                <p className="text-orange-100 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Sistemas de Gestão</p>
             </div>
          </div>
          <form onSubmit={handleLogin} className="p-10 space-y-6">
            {loginError && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100 animate-bounce">{loginError}</div>}
            <div className="space-y-4">
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" placeholder="Usuário" className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500 outline-none transition-all font-semibold" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} required />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="password" placeholder="Senha" className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500 outline-none transition-all font-semibold" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} required />
              </div>
            </div>
            <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-100 transition-all transform hover:scale-[1.02] active:scale-95">Entrar no Sistema</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-hidden">
      <Sidebar currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'pos' && <POS currentUser={currentUser} currentSession={currentSession} />}
        {activeTab === 'agreements' && <Agreements />}
        {activeTab === 'products' && <Inventory />}
        {activeTab === 'history' && <History />}
        {activeTab === 'cashier' && <Cashier currentUser={currentUser} currentSession={currentSession} refreshSession={refreshSession} />}
      </main>
    </div>
  );
};

export default App;
