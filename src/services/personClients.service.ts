import { repositories } from '../data/repositories';
import { PersonClient } from '../domain/types';
import { toAppError, AppError } from './appError';

export const personClientsService = {
  list: async (params?: any) => {
    try {
      return await repositories.personClients.list(params);
    } catch (e) {
      throw toAppError(e);
    }
  },

  create: async (data: Partial<PersonClient>): Promise<PersonClient> => {
    try {
      // 1. Check Duplication
      const res = await repositories.personClients.list({ limit: 1000 });
      const exists = res.data.some(c => 
        c.name.toLowerCase() === data.name?.toLowerCase() && 
        c.whatsapp === data.whatsapp
      );
      if (exists) {
        throw new AppError("Já existe um cliente PF com este Nome e WhatsApp.", 'DUPLICATE_ENTRY');
      }

      return await repositories.personClients.create(data);
    } catch (e) {
      throw toAppError(e);
    }
  },

  update: async (id: string, data: Partial<PersonClient>): Promise<PersonClient> => {
    try {
      return await repositories.personClients.update(id, data);
    } catch (e) {
      throw toAppError(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      // 1. Check Dependencies (Orders)
      const res = await repositories.orders.list({ limit: 1000, filters: { client_id: id } });
      if (res.total > 0) {
        throw new AppError("Não é possível excluir: Existem pedidos vinculados a este cliente.", 'DEPENDENCY_ERROR');
      }

      await repositories.personClients.remove(id);
    } catch (e) {
      throw toAppError(e);
    }
  }
};
