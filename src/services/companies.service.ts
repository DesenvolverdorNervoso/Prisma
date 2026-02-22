import { repositories } from '../data/repositories';
import { Company } from '../domain/types';
import { toAppError, AppError } from './appError';

export const companiesService = {
  list: async (params?: any) => {
    try {
      return await repositories.companies.list(params);
    } catch (e) {
      throw toAppError(e);
    }
  },

  create: async (data: Partial<Company>): Promise<Company> => {
    try {
      // 1. Check Duplication
      const res = await repositories.companies.list({ limit: 1000 });
      const exists = res.data.some(c => c.name.toLowerCase() === data.name?.toLowerCase());
      if (exists) {
        throw new AppError("Já existe uma empresa cadastrada com este Nome Fantasia.", 'DUPLICATE_ENTRY');
      }

      return await repositories.companies.create(data);
    } catch (e) {
      throw toAppError(e);
    }
  },

  update: async (id: string, data: Partial<Company>): Promise<Company> => {
    try {
      return await repositories.companies.update(id, data);
    } catch (e) {
      throw toAppError(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      // 1. Check Dependencies (Jobs)
      const res = await repositories.jobs.list({ limit: 1000 });
      const activeJobs = res.data.filter(j => 
        j.company_id === id && 
        j.status !== 'Encerrada' && 
        j.status !== 'Cancelada'
      );

      if (activeJobs.length > 0) {
        throw new AppError("Não é possível excluir: A empresa possui vagas ativas.", 'DEPENDENCY_ERROR');
      }

      await repositories.companies.remove(id);
    } catch (e) {
      throw toAppError(e);
    }
  }
};
