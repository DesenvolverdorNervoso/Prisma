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
      const hasJobs = await repositories.jobs.exists({ company_id: id });
      if (hasJobs) {
        throw new AppError("Não é possível excluir a empresa: existem Vagas vinculadas. Encerre ou remova os vínculos primeiro.", 'CONFLICT');
      }

      // 2. Check Dependencies (Orders)
      const hasOrders = await repositories.orders.exists({ company_id: id });
      if (hasOrders) {
        throw new AppError("Não é possível excluir a empresa: existem Atendimentos vinculados. Encerre ou remova os vínculos primeiro.", 'CONFLICT');
      }

      // 3. Check Dependencies (Finance)
      // Note: Finance transactions might be linked via order, but some might be direct if the schema allows.
      // Checking if any finance transaction references this company (if column exists)
      // If the column is not there, we rely on orders.
      // Assuming 'company_id' might exist in finance_transactions based on the request.
      const hasFinance = await repositories.finance.exists({ company_id: id });
      if (hasFinance) {
        throw new AppError("Não é possível excluir a empresa: existem movimentações Financeiras vinculadas. Encerre ou remova os vínculos primeiro.", 'CONFLICT');
      }

      await repositories.companies.remove(id);
    } catch (e) {
      throw toAppError(e);
    }
  }
};
