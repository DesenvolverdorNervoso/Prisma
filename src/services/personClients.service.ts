import { repositories } from '../data/repositories';
import { PersonClient } from '../domain/types';
import { toAppError, AppError } from './appError';
import { tagService } from './tag.service';

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
      // 1. Validations
      if (!data.name) {
        throw new AppError("Nome é obrigatório.", 'VALIDATION');
      }
      if (!data.whatsapp || data.whatsapp.replace(/\D/g, '').length < 10) {
        throw new AppError("WhatsApp inválido. Mínimo 10 dígitos.", 'VALIDATION');
      }
      if (!data.city) {
        throw new AppError("Cidade é obrigatória.", 'VALIDATION');
      }

      // 2. Check Duplication
      const res = await repositories.personClients.list({ limit: 1000 });
      const exists = res.data.some(c => 
        c.name.toLowerCase() === data.name?.toLowerCase() && 
        c.whatsapp === data.whatsapp
      );
      if (exists) {
        throw new AppError("Já existe um cliente PF com este Nome e WhatsApp.", 'DUPLICATE_ENTRY');
      }

      // 3. Apply default tag
      const defaultTag = await tagService.ensureDefaultTag('person_client');
      const clientData = {
        ...data,
        tags: Array.from(new Set([...(data.tags || []), defaultTag]))
      };

      return await repositories.personClients.create(clientData);
    } catch (e) {
      throw toAppError(e);
    }
  },

  update: async (id: string, data: Partial<PersonClient>): Promise<PersonClient> => {
    try {
      if (data.whatsapp !== undefined && data.whatsapp.replace(/\D/g, '').length < 10) {
        throw new AppError("WhatsApp inválido. Mínimo 10 dígitos.", 'VALIDATION');
      }
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
