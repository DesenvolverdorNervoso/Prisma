import { repositories } from '../data/repositories';
import { PersonClient } from '../domain/types';
import { DomainError, ErrorCodes } from '../domain/errors';

export const personClientsService = {
  list: (params?: any) => repositories.personClients.list(params),

  create: async (data: Partial<PersonClient>): Promise<PersonClient> => {
    // 1. Check Duplication
    const res = await repositories.personClients.list({ limit: 1000 });
    const exists = res.data.some(c => 
      c.name.toLowerCase() === data.name?.toLowerCase() && 
      c.whatsapp === data.whatsapp
    );
    if (exists) {
      throw new DomainError("Já existe um cliente PF com este Nome e WhatsApp.", ErrorCodes.DUPLICATE_ENTRY);
    }

    // 2. Creation (Tagging is handled by repository beforeCreate hook)
    return await repositories.personClients.create(data);
  },

  update: async (id: string, data: Partial<PersonClient>): Promise<PersonClient> => {
    return await repositories.personClients.update(id, data);
  },

  delete: async (id: string): Promise<void> => {
    // 1. Check Dependencies (Orders)
    const res = await repositories.orders.list({ limit: 1000, filters: { client_id: id } });
    if (res.total > 0) {
      throw new DomainError("Não é possível excluir: Existem pedidos vinculados a este cliente.", ErrorCodes.dependency('ORDERS'));
    }

    await repositories.personClients.remove(id);
  }
};