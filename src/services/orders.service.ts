import { repositories } from '../data/repositories';
import { Order } from '../domain/types';
import { DomainError, ErrorCodes } from '../domain/errors';
import { financeService } from './finance.service';

export interface EnrichedOrder extends Order {
  client_name: string;
  service_name: string;
}

export const ordersService = {
  listEnriched: async (): Promise<EnrichedOrder[]> => {
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
        const client = clientsPF.find(c => c.id === order.person_client_id);
        if (client) clientName = client.name;
      } else {
        const company = companies.find(c => c.id === order.company_id);
        if (company) clientName = company.name;
      }

      const service = services.find(s => s.id === order.service_id);
      const serviceName = service ? service.name : 'Serviço Removido';

      return { ...order, client_name: clientName, service_name: serviceName };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  create: async (data: Partial<Order>) => {
    // Validation
    if (data.client_type === 'PF' && !data.person_client_id) {
      throw new DomainError("O cliente (Pessoa Física) é obrigatório.", ErrorCodes.VALIDATION_ERROR);
    }
    if (data.client_type === 'PJ' && !data.company_id) {
      throw new DomainError("A empresa (PJ) é obrigatória.", ErrorCodes.VALIDATION_ERROR);
    }
    if (!data.service_id) throw new DomainError("O serviço é obrigatório.", ErrorCodes.VALIDATION_ERROR);
    if (!data.value || data.value <= 0) throw new DomainError("O valor deve ser maior que zero.", ErrorCodes.VALIDATION_ERROR);

    // Ensure nulls for the other side
    const payload = { ...data };
    if (payload.client_type === 'PF') {
      payload.company_id = null;
    } else {
      payload.person_client_id = null;
    }

    return await repositories.orders.create(payload);
  },

  update: async (id: string, data: Partial<Order>) => {
    if (data.value !== undefined && data.value <= 0) throw new DomainError("O valor deve ser maior que zero.", ErrorCodes.VALIDATION_ERROR);
    
    const payload = { ...data };
    if (payload.client_type === 'PF' && payload.person_client_id) {
      payload.company_id = null;
    } else if (payload.client_type === 'PJ' && payload.company_id) {
      payload.person_client_id = null;
    }

    return await repositories.orders.update(id, payload);
  },

  delete: async (id: string) => {
    // Check for Finance dependency
    const res = await repositories.finance.list({ limit: 10000 });
    const linked = res.data.find(f => f.order_id === id);
    if (linked) {
      throw new DomainError("Não é possível excluir: Existe uma movimentação financeira associada.", ErrorCodes.dependency('FINANCE'));
    }
    await repositories.orders.remove(id);
  },

  generateFinanceEntry: async (order: EnrichedOrder) => {
    return await financeService.createEntryFromOrder(order);
  },
  
  // Helper to fetch dependencies for the UI dropdowns
  getDependencies: async () => {
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
  }
};