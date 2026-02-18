
import React, { useEffect, useState } from 'react';
import { Sale, CorporateEmployee } from '../types';
import { db } from '../services/db';

interface ReceiptProps {
  sale: Sale;
  className?: string;
  id?: string;
}

const Receipt: React.FC<ReceiptProps> = ({ sale, className = "", id }) => {
  const [employee, setEmployee] = useState<CorporateEmployee | null>(null);
  const isComanda = sale.status === 'OPEN';
  
  useEffect(() => {
    const loadEmployee = async () => {
      if (sale.employeeId) {
        const employees = await db.getEmployees();
        const found = employees.find(e => e.id === sale.employeeId);
        setEmployee(found || null);
      }
    };
    loadEmployee();
  }, [sale.employeeId]);

  const paymentMethodLabels: Record<string, string> = {
    'CASH': 'DINHEIRO',
    'CREDIT': 'CARTÃO DE CRÉDITO',
    'DEBIT': 'CARTÃO DE DÉBITO',
    'PIX': 'PIX',
    'AGREEMENT': 'CONVÊNIO'
  };

  return (
    <div 
      id={id}
      className={`text-xs font-mono w-[80mm] p-6 bg-white text-black mx-auto shadow-sm print:shadow-none print:p-0 ${className}`}
    >
      <div className="text-center mb-4">
        <h2 className="text-xl font-black uppercase tracking-tight">JS RESTO GOURMET</h2>
        {isComanda ? (
          <div className="bg-black text-white py-1 my-2 font-black text-sm print:bg-black print:text-white">*** COMANDA EM ABERTO ***</div>
        ) : (
          <div className="border border-black py-1 my-2 font-black text-xs uppercase">Cupom de Venda</div>
        )}
        {!isComanda && <p className="text-[10px] font-bold">CNPJ: 12.345.678/0001-90</p>}
        <p className="text-[10px]">Rua das Flores, 123 - Centro</p>
      </div>
      
      <div className="border-t border-dashed border-black my-2"></div>
      
      <div className="mb-2 space-y-0.5">
        <p className="font-black uppercase">CLIENTE: {sale.customerName || 'Balcão'}</p>
        <p className="font-bold">PEDIDO: {sale.orderNumber}</p>
        <p>DATA: {new Date(sale.timestamp).toLocaleString('pt-BR')}</p>
        <p>OPERADOR: {sale.operatorId}</p>
      </div>
      
      <div className="border-t border-dashed border-black my-2"></div>
      
      <div className="mb-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-black text-[10px] font-black">
              <th className="pb-1">DESCRIÇÃO</th>
              <th className="text-right pb-1">QTD</th>
              <th className="text-right pb-1">TOTAL</th>
            </tr>
          </thead>
          <tbody className="pt-1">
            {sale.items.map((item) => (
              <tr key={item.id}>
                <td className="max-w-[140px] overflow-hidden whitespace-nowrap py-1 uppercase">{item.name}</td>
                <td className="text-right py-1 whitespace-nowrap">
                  {item.unit === 'KG' ? item.quantity.toFixed(3) : item.quantity} {item.unit}
                </td>
                <td className="text-right py-1 font-bold">{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="border-t border-dashed border-black my-2"></div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>R$ {sale.subtotal.toFixed(2)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between font-bold">
            <span>Desconto:</span>
            <span>- R$ {sale.discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-lg mt-2 border-t-2 border-double border-black pt-1">
          <span>{isComanda ? 'SALDO PARCIAL:' : 'TOTAL GERAL:'}</span>
          <span>R$ {sale.total.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="border-t border-dashed border-black my-4"></div>
      
      <div className="text-center space-y-4">
        {!isComanda && (
          <div className="border border-black p-2 inline-block w-full">
            <p className="font-black text-[10px] uppercase">
              Forma de Pagamento: {paymentMethodLabels[sale.paymentMethod || ''] || sale.paymentMethod}
            </p>
          </div>
        )}

        {/* Campo de Assinatura para Convênios */}
        {sale.paymentMethod === 'AGREEMENT' && (
          <div className="mt-8 pt-8 space-y-2 animate-in fade-in duration-700">
            <div className="border-t border-black w-full mx-auto"></div>
            <p className="text-[10px] font-black uppercase">Assinatura do Funcionário</p>
            {employee && (
              <p className="text-[9px] font-bold text-gray-600 uppercase">({employee.name})</p>
            )}
          </div>
        )}

        <div className="pt-4 space-y-1">
          <p className="text-[10px] uppercase font-black tracking-[0.2em]">
            {isComanda ? 'Conferir no caixa' : 'Cupom Não Fiscal'}
          </p>
          <p className="text-[9px] italic">JS Resto Software - Agradecemos a visita!</p>
        </div>
      </div>
      
      <div className="h-12"></div>
    </div>
  );
};

export default Receipt;
