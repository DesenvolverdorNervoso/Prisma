import { repositories } from '../data/repositories';
import { Order } from '../domain/types';
import { toAppError, AppError } from './appError';
import { financeService } from './finance.service';

export interface EnrichedOrder extends Order {
  client_name: string;
  service_name: string;
}

export const ordersService = {
  listEnriched: async (): Promise<EnrichedOrder[]> => {
    try {
      const [ordersRes, clientsPFRes, companiesRes, servicesRes] = await Promise.all([
        repositories.orders.list({ limit: 10000 }),
        repositories.personClients.list({ limit: 10000 }),
        repositories.companies.list({ limit: 10000 }),
        repositories.services.list({ limit: 10000 })
      ]);

      const orders = ordersRes.data;
      const clientsPF = clientsPFRes.data;
      const companies = companiesRes.data;
      const services = servicesRes.data;

      return orders.map(order => {
        let clientName = 'Cliente Desconhecido';
        if (order.client_type === 'PF') {
          const client = clientsPF.find(c => c.id === order.client_id);
          if (client) clientName = client.name;
        } else {
          const company = companies.find(c => c.id === order.client_id);
          if (company) clientName = company.name;
        }

        const service = services.find(s => s.id === order.service_id);
        const serviceName = service ? service.name : 'Serviço Removido';

        return { ...order, client_name: clientName, service_name: serviceName };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (e) {
      throw toAppError(e);
    }
  },

  create: async (data: Partial<Order>) => {
    try {
      if (!data.client_id) throw new AppError("O cliente é obrigatório.", 'VALIDATION');
      if (!data.service_id) throw new AppError("O serviço é obrigatório.", 'VALIDATION');
      if (!data.value || data.value <= 0) throw new AppError("O valor deve ser maior que zero.", 'VALIDATION');

      return await repositories.orders.create(data);
    } catch (e) {
      throw toAppError(e);
    }
  },

  update: async (id: string, data: Partial<Order>) => {
    try {
      if (data.value !== undefined && data.value <= 0) throw new AppError("O valor deve ser maior que zero.", 'VALIDATION');
      return await repositories.orders.update(id, data);
    } catch (e) {
      throw toAppError(e);
    }
  },

  delete: async (id: string) => {
    try {
      // Check for Finance dependency
      const hasFinance = await repositories.finance.exists({ order_id: id });
      if (hasFinance) {
        throw new AppError("Não é possível excluir: Existe uma movimentação financeira associada. Remova/Desvincule a movimentação financeira antes.", 'CONFLICT');
      }
      await repositories.orders.remove(id);
    } catch (e) {
      throw toAppError(e);
    }
  },

  generateFinanceEntry: async (order: EnrichedOrder) => {
    try {
      return await financeService.createEntryFromOrder(order);
    } catch (e) {
      throw toAppError(e);
    }
  },
  
  // Helper to fetch dependencies for the UI dropdowns
  getDependencies: async () => {
    try {
      const [clientsPFRes, companiesRes, servicesRes] = await Promise.all([
        repositories.personClients.list({ limit: 1000 }),
        repositories.companies.list({ limit: 1000 }),
        repositories.services.list({ limit: 1000 })
      ]);
      return { 
        clientsPF: clientsPFRes.data, 
        companies: companiesRes.data, 
        services: servicesRes.data 
      };
    } catch (e) {
      throw toAppError(e);
    }
  }
};
