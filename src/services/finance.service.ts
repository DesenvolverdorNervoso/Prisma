import { repositories } from '../data/repositories';
import { Order, FinanceTransaction } from '../domain/types';

export const financeService = {
  list: (params?: any) => repositories.finance.list(params),

  create: (data: Partial<FinanceTransaction>) => repositories.finance.create(data),

  update: (id: string, data: Partial<FinanceTransaction>) => repositories.finance.update(id, data),
  
  delete: (id: string) => repositories.finance.remove(id),

  createEntryFromOrder: async (order: Order) => {
    // Logic moved here from UI/Rules
    const description = `Serviço concluído - Pedido #${order.id.slice(0, 4)} - ${order.client_name || 'Cliente'}`;
    
    await repositories.finance.create({
      type: 'Entrada',
      value: order.value,
      description: description,
      status: 'Pendente',
      date: new Date().toISOString().split('T')[0],
      category: 'Serviços',
      order_id: order.id
    });
  },

  getOrdersWithFinanceIds: async (): Promise<Set<string>> => {
    const result = await repositories.finance.list({ limit: 10000 });
    const orderIds = new Set<string>();
    result.data.forEach(t => {
      if (t.order_id) orderIds.add(t.order_id);
    });
    return orderIds;
  },

  getSummary: async () => {
    const res = await repositories.finance.list({ limit: 10000 });
    const transactions = res.data;
    
    const totalIn = transactions.filter(t => t.type === 'Entrada').reduce((acc, t) => acc + t.value, 0);
    const totalOut = transactions.filter(t => t.type === 'Saída').reduce((acc, t) => acc + t.value, 0);
    
    return {
      totalIn,
      totalOut,
      balance: totalIn - totalOut
    };
  }
};