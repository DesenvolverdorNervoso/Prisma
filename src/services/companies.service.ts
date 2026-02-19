import { repositories } from '../data/repositories';
import { Company } from '../domain/types';
import { DomainError, ErrorCodes } from '../domain/errors';

export const companiesService = {
  list: (params?: any) => repositories.companies.list(params),

  create: async (data: Partial<Company>): Promise<Company> => {
    // 1. Check Duplication
    const res = await repositories.companies.list({ limit: 1000 });
    const exists = res.data.some(c => c.name.toLowerCase() === data.name?.toLowerCase());
    if (exists) {
      throw new DomainError("Já existe uma empresa cadastrada com este Nome Fantasia.", ErrorCodes.DUPLICATE_ENTRY);
    }

    // 2. Ensure/Create Tag
    let labelId: string;
    const labelRes = await repositories.labels.list({ limit: 1000 });
    const existingLabel = labelRes.data.find(l => l.name === 'Cliente PJ - Empresa' && l.entityType === 'company');
    
    if (existingLabel) {
      labelId = existingLabel.id;
    } else {
      const newLabel = await repositories.labels.create({
        name: 'Cliente PJ - Empresa',
        entityType: 'company',
        color: '#bfdbfe'
      });
      labelId = newLabel.id;
    }

    // 3. Apply Tag
    const labels = data.labels || [];
    if (!labels.includes(labelId)) {
      labels.push(labelId);
    }

    return await repositories.companies.create({ ...data, labels });
  },

  update: async (id: string, data: Partial<Company>): Promise<Company> => {
    return await repositories.companies.update(id, data);
  },

  delete: async (id: string): Promise<void> => {
    // 1. Check Dependencies (Jobs)
    const res = await repositories.jobs.list({ limit: 1000 });
    const activeJobs = res.data.filter(j => 
      j.company_id === id && 
      j.status !== 'Encerrada' && 
      j.status !== 'Cancelada'
    );

    if (activeJobs.length > 0) {
      throw new DomainError("Não é possível excluir: A empresa possui vagas ativas.", ErrorCodes.dependency('JOBS'));
    }

    await repositories.companies.remove(id);
  }
};