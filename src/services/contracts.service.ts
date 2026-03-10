import { repositories } from '../data/repositories';
import { Contract, QueryParams } from '../domain/types';
import { supabase } from '../lib/supabaseClient';

export const contractsService = {
  list: async (params?: QueryParams) => {
    const result = await repositories.contracts.list(params);
    
    // Enrich with names if needed, though we could also do this via a view or join in the repo
    // For now, let's assume we want to fetch related data for the UI
    const enrichedData = await Promise.all(result.data.map(async (contract) => {
      const [candidate, company, person] = await Promise.all([
        repositories.candidates.get(contract.candidate_id),
        contract.company_id ? repositories.companies.get(contract.company_id) : Promise.resolve(null),
        contract.person_client_id ? repositories.personClients.get(contract.person_client_id) : Promise.resolve(null)
      ]);

      return {
        ...contract,
        candidate_name: candidate?.name || 'Candidato não encontrado',
        contractor_name: contract.contractor_type === 'company' ? company?.name : person?.name,
        job_title: contract.job_id ? (await repositories.jobs.get(contract.job_id))?.title : undefined
      };
    }));

    return {
      ...result,
      data: enrichedData
    };
  },

  get: async (id: string) => {
    const contract = await repositories.contracts.get(id);
    if (!contract) return null;

    const [candidate, company, person, job] = await Promise.all([
      repositories.candidates.get(contract.candidate_id),
      contract.company_id ? repositories.companies.get(contract.company_id) : Promise.resolve(null),
      contract.person_client_id ? repositories.personClients.get(contract.person_client_id) : Promise.resolve(null),
      contract.job_id ? repositories.jobs.get(contract.job_id) : Promise.resolve(null)
    ]);

    return {
      ...contract,
      candidate_name: candidate?.name,
      contractor_name: contract.contractor_type === 'company' ? company?.name : person?.name,
      job_title: job?.title
    };
  },

  create: async (data: Partial<Contract>) => {
    return repositories.contracts.create(data);
  },

  update: async (id: string, data: Partial<Contract>) => {
    return repositories.contracts.update(id, data);
  },

  remove: async (id: string) => {
    return repositories.contracts.remove(id);
  },

  getActiveContractsByCandidate: async (candidateId: string) => {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('status', 'Ativo');
    
    if (error) throw error;
    return data as Contract[];
  }
};
