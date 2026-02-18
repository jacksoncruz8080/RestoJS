
import React from 'react';
import { LayoutDashboard, ShoppingCart, Package, History, Wallet, Building2 } from 'lucide-react';
import { Product } from './types';

export const CATEGORIES = [
  "Bebidas", "Lanches", "Pratos Executivos", "Sobremesas", "Porções", "Pizzas", "Self-Service"
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['ADMIN'] },
  { id: 'pos', label: 'PDV', icon: <ShoppingCart size={20} />, roles: ['ADMIN', 'OPERATOR'] },
  { id: 'agreements', label: 'Convênios', icon: <Building2 size={20} />, roles: ['ADMIN'] },
  { id: 'products', label: 'Produtos', icon: <Package size={20} />, roles: ['ADMIN'] },
  { id: 'history', label: 'Histórico', icon: <History size={20} />, roles: ['ADMIN', 'OPERATOR'] },
  { id: 'cashier', label: 'Caixa', icon: <Wallet size={20} />, roles: ['ADMIN', 'OPERATOR'] },
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', code: '001', name: 'Coca-Cola 350ml', category: 'Bebidas', price: 6.50, cost: 3.20, stock: 50, active: true, unit: 'UN', image: 'https://picsum.photos/seed/coke/200' },
  { id: '2', code: '002', name: 'X-Burger Artesanal', category: 'Lanches', price: 32.90, cost: 14.50, stock: 30, active: true, unit: 'UN', image: 'https://picsum.photos/seed/burger/200' },
  { id: '3', code: '003', name: 'Batata Frita G', category: 'Porções', price: 25.00, cost: 8.00, stock: 100, active: true, unit: 'UN', image: 'https://picsum.photos/seed/fries/200' },
  { id: '7', code: '007', name: 'Almoço Buffet (Kg)', category: 'Self-Service', price: 69.90, cost: 22.00, stock: 999, active: true, unit: 'KG', image: 'https://picsum.photos/seed/food/200' },
  { id: '5', code: '005', name: 'Pizza Margherita M', category: 'Pizzas', price: 45.00, cost: 18.00, stock: 20, active: true, unit: 'UN', image: 'https://picsum.photos/seed/pizza/200' },
  { id: '6', code: '006', name: 'Pudim de Leite', category: 'Sobremesas', price: 15.00, cost: 5.00, stock: 15, active: true, unit: 'UN', image: 'https://picsum.photos/seed/pudding/200' },
];
