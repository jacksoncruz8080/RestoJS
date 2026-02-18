
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Product } from '../types';
import { Plus, Edit2, Trash2, Search, X, Package, Layers, Scale, Upload, Image as ImageIcon } from 'lucide-react';

const Inventory: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'categories'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm: Omit<Product, 'id'> = {
    code: '',
    name: '',
    category: '',
    price: 0,
    cost: 0,
    stock: 0,
    active: true,
    unit: 'UN',
    image: 'https://picsum.photos/seed/product/200'
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadData();
  }, [isModalOpen, activeSubTab]);

  const loadData = async () => {
    const [productsData, categoriesData] = await Promise.all([
      db.getProducts(),
      db.getCategories()
    ]);
    setProducts(productsData);
    setCategories(categoriesData);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.category) {
      alert("Por favor, preencha o nome e a categoria.");
      return;
    }
    const product: Product = {
      ...formData,
      id: editingProduct ? editingProduct.id : Math.random().toString(36).substr(2, 9),
    };
    await db.saveProduct(product);
    const productsData = await db.getProducts();
    setProducts(productsData);
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja realmente excluir este produto?")) {
      await db.deleteProduct(id);
      const productsData = await db.getProducts();
      setProducts(productsData);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await db.saveCategory(newCategoryName.trim());
    const categoriesData = await db.getCategories();
    setCategories(categoriesData);
    setNewCategoryName('');
  };

  const handleDeleteCategory = async (cat: string) => {
    const hasProducts = products.some(p => p.category === cat);
    if (hasProducts) {
      alert("Não é possível excluir uma categoria com produtos vinculados.");
      return;
    }
    if (window.confirm(`Excluir categoria "${cat}"?`)) {
      await db.deleteCategory(cat);
      const categoriesData = await db.getCategories();
      setCategories(categoriesData);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const openModal = async (product?: Product) => {
    const categoriesData = await db.getCategories();
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product });
    } else {
      setEditingProduct(null);
      setFormData({ ...initialForm, category: categoriesData[0] || '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.includes(searchTerm) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Gestão JS Resto</h2>
          <p className="text-gray-500 font-medium">Controle de cardápio, estoque e categorias.</p>
        </div>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveSubTab('products')}
            className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${activeSubTab === 'products' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Package size={18} /> Itens
          </button>
          <button 
            onClick={() => setActiveSubTab('categories')}
            className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${activeSubTab === 'categories' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Layers size={18} /> Categorias
          </button>
        </div>
      </header>

      {activeSubTab === 'products' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar produto..." 
                className="w-full pl-10 pr-4 py-3 rounded-2xl border-none bg-white shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => openModal()}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-2xl shadow-lg shadow-orange-100 transition-all flex items-center gap-2 font-black"
            >
              <Plus size={20} /> Adicionar Item
            </button>
          </div>

          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Produto</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Preço</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img src={product.image} className="w-12 h-12 rounded-xl object-cover bg-gray-100 border" />
                        <div>
                          <p className="font-bold text-gray-800">{product.name}</p>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Cód: {product.code} | {product.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-black uppercase">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-gray-800">
                      R$ {product.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openModal(product)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                        <button onClick={() => handleDelete(product.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl bg-white rounded-3xl border shadow-sm p-8 space-y-8 animate-in slide-in-from-right-4">
           <h3 className="text-xl font-black text-gray-800">Gerenciar Categorias do JS Resto</h3>
           <div className="flex gap-3">
              <input 
                type="text" 
                placeholder="Ex: Pizzas, Bebidas, Sobremesas..." 
                className="flex-1 px-5 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 border-none font-bold"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
              />
              <button 
                onClick={handleAddCategory}
                className="px-8 py-4 bg-orange-500 text-white font-black rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-100"
              >
                Cadastrar
              </button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map(cat => (
                <div key={cat} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-orange-100">
                  <span className="font-bold text-gray-700">{cat}</span>
                  <button onClick={() => handleDeleteCategory(cat)} className="text-gray-300 hover:text-red-500 transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 overflow-hidden">
            <header className="p-8 border-b flex items-center justify-between bg-gray-50">
              <h3 className="text-xl font-black flex items-center gap-2">
                <Package className="text-orange-500" />
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-white rounded-full transition-colors"><X /></button>
            </header>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                 <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Identificação</label>
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      value={formData.code} 
                      onChange={e => setFormData({...formData, code: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                      placeholder="Código (SKU)"
                    />
                    <input 
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                      placeholder="Nome do Produto"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Classificação</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500 outline-none appearance-none font-bold"
                  >
                    <option value="" disabled>Selecione a Categoria</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setFormData({...formData, unit: 'UN'})} className={`py-3 rounded-2xl font-black text-xs transition-all ${formData.unit === 'UN' ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>UNIDADE</button>
                  <button onClick={() => setFormData({...formData, unit: 'KG'})} className={`py-3 rounded-2xl font-black text-xs transition-all ${formData.unit === 'KG' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>QUILO</button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Preços & Estoque</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">R$</span>
                      <input 
                        type="number" 
                        value={formData.price || ''} 
                        onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500 outline-none font-black"
                        placeholder="Venda"
                      />
                    </div>
                    <input 
                      type="number" 
                      value={formData.stock || ''} 
                      onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                      placeholder="Qtd"
                    />
                  </div>
                </div>
                
                <div className="p-6 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block text-center">Imagem Representativa</label>
                  <div className="flex flex-col items-center gap-4">
                    <img src={formData.image} className="w-24 h-24 rounded-2xl object-cover bg-white border-4 border-white shadow-xl" />
                    <div className="flex gap-2 w-full">
                       <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 bg-white text-gray-700 px-4 py-3 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 border hover:bg-orange-50 hover:text-orange-600 transition-all"
                       >
                         <Upload size={14} /> DO MEU PC
                       </button>
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Ou cole o link da imagem aqui..."
                      className="w-full px-4 py-2 bg-white rounded-xl text-[10px] outline-none border focus:ring-1 focus:ring-orange-500 font-medium"
                      value={!formData.image ? '' : formData.image.startsWith('data:') ? 'Imagem Local Carregada' : formData.image}
                      onChange={e => setFormData({...formData, image: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>

            <footer className="p-8 border-t bg-gray-50 flex gap-4">
              <button onClick={closeModal} className="flex-1 px-8 py-4 bg-white border text-gray-500 font-black rounded-2xl hover:bg-gray-100 transition-all">Sair</button>
              <button onClick={handleSave} className="flex-1 px-8 py-4 bg-orange-500 text-white font-black rounded-2xl shadow-xl shadow-orange-100 hover:bg-orange-600 transition-all">Salvar Alterações</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
