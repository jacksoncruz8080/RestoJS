
import React from 'react';
import { User, UserRole } from '../types';
import { NAV_ITEMS } from '../constants';
import { LogOut, ChefHat } from 'lucide-react';

interface SidebarProps {
  currentUser: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentUser, activeTab, setActiveTab, onLogout }) => {
  if (!currentUser) return null;

  const filteredNavItems = NAV_ITEMS.filter(item => 
    item.roles.includes(currentUser.role)
  );

  return (
    <aside className="w-64 bg-white h-screen border-r flex flex-col no-print">
      <div className="p-6 flex items-center gap-3 border-b">
        <div className="bg-orange-500 p-2 rounded-lg text-white">
          <ChefHat size={28} />
        </div>
        <div>
          <h1 className="font-bold text-xl text-gray-800 leading-tight tracking-tight">JS Resto</h1>
          <span className="text-[10px] text-orange-500 font-black tracking-[0.2em] uppercase">Software</span>
        </div>
      </div>

      <nav className="flex-1 mt-6 px-4 space-y-2">
        {filteredNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                : 'text-gray-500 hover:bg-orange-50 hover:text-orange-600'
            }`}
          >
            {item.icon}
            <span className="font-bold text-sm tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t">
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black uppercase text-sm border-2 border-white">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate text-gray-800 leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">{currentUser.role === UserRole.ADMIN ? 'Administrador' : 'Operador'}</p>
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold text-sm"
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
