import { repositories } from '../data/repositories';
import { Job, JobCandidateStatus, JobCandidate } from '../domain/types';
import { DomainError, ErrorCodes } from '../domain/errors';
import { toAppError } from './appError';

export interface EnrichedJob extends Job {
  contractor_name: string;
}

export const jobsService = {
  list: async (params?: any) => {
    try {
      return await repositories.jobs.list(params);
    } catch (e) {
      throw toAppError(e);
    }
  },

  listEnriched: async (params?: any): Promise<{ data: EnrichedJob[], total: number, page: number, totalPages: number }> => {
    try {
      const jobsRes = await repositories.jobs.list(params);
      const [companiesRes, personClientsRes] = await Promise.all([
        repositories.companies.list({ limit: 10000 }),
        repositories.personClients.list({ limit: 10000 })
      ]);

      const companies = companiesRes.data;
      const personClients = personClientsRes.data;

      const enrichedData = jobsRes.data.map(job => {
        let contractorName = 'Contratante Desconhecido';
        if (job.contractor_type === 'person_client') {
          const pc = personClients.find(c => c.id === job.person_client_id);
          if (pc) contractorName = pc.name;
        } else {
          // Default to company
          const comp = companies.find(c => c.id === job.company_id);
          if (comp) contractorName = comp.name;
          else if (job.company_name) contractorName = job.company_name; // Fallback to legacy field
        }

        return { ...job, contractor_name: contractorName };
      });

      return { ...jobsRes, data: enrichedData };
    } catch (e) {
      throw toAppError(e);
    }
  },

  getDependencies: async () => {
    try {
      const [companiesRes, personClientsRes] = await Promise.all([
        repositories.companies.list({ limit: 1000 }),
        repositories.personClients.list({ limit: 1000 })
      ]);
      return {
        companies: companiesRes.data,
        personClients: personClientsRes.data
      };
    } catch (e) {
      throw toAppError(e);
    }
  },

  create: async (data: Partial<Job>): Promise<Job> => {
    try {
      if (!data.requirements_list || data.requirements_list.length === 0) {
         // Allow legacy requirements string if list is empty
         if (!data.requirements?.trim()) {
             throw new DomainError("A vaga deve ter pelo menos um requisito.", ErrorCodes.VALIDATION_ERROR);
         }
      }
      return await repositories.jobs.create(data);
    } catch (e) {
      throw toAppError(e);
    }
  },

  update: async (id: string, data: Partial<Job>): Promise<Job> => {
    try {
      // If status is changing, handle side effects
      if (data.status) {
         const now = new Date();
         if (data.status === 'Encerrada') data.closed_at = now.toISOString();
         if (data.status === 'Cancelada') data.canceled_at = now.toISOString();
         if (data.status === 'Contratou por fora') {
           data.outside_recruitment_date = now.toISOString();
           const expiry = new Date(now);
           expiry.setMonth(expiry.getMonth() + 6);
           data.outside_recruitment_expiry = expiry.toISOString();
         }
      }
      return await repositories.jobs.update(id, data);
    } catch (e) {
      throw toAppError(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      // Check if there are candidates
      const res = await repositories.jobCandidates.list({ limit: 1000 });
      const linked = res.data.filter(jc => jc.job_id === id);
      if (linked.length > 0) {
         throw new DomainError(`Esta vaga possui ${linked.length} candidatos vinculados. Remova os vínculos antes de excluir.`, ErrorCodes.dependency('JOB_CANDIDATES'));
      }
      await repositories.jobs.remove(id);
    } catch (e) {
      throw toAppError(e);
    }
  },

  addCandidateToJob: async (jobId: string, candidateId: string) => {
    try {
      const res = await repositories.jobCandidates.list({ limit: 10000 });
      const isLinked = res.data.find(jc => jc.job_id === jobId && jc.candidate_id === candidateId);
      if (isLinked) {
        throw new DomainError("Candidato já vinculado a esta vaga.", ErrorCodes.DUPLICATE_ENTRY);
      }

      await repositories.jobCandidates.create({
        job_id: jobId,
        candidate_id: candidateId,
        status: 'Triagem'
      });
    } catch (e) {
      throw toAppError(e);
    }
  },

  updateJobCandidateStatus: async (jobCandidate: JobCandidate, newStatus: JobCandidateStatus) => {
    try {
      await repositories.jobCandidates.update(jobCandidate.id, { status: newStatus });

      // Propagate to Global Candidate Status
      if (newStatus === 'Encaminhado') {
        await repositories.candidates.update(jobCandidate.candidate_id, { status: 'Encaminhado' });
      } else if (newStatus === 'Em teste') {
        await repositories.candidates.update(jobCandidate.candidate_id, { status: 'Em teste' });
      } else if (newStatus === 'Aprovado') {
        await repositories.candidates.update(jobCandidate.candidate_id, { status: 'Aprovado' });
      } else if (newStatus === 'Contratado') {
        await repositories.candidates.update(jobCandidate.candidate_id, { status: 'Contratado', is_working: true });
      }
    } catch (e) {
      throw toAppError(e);
    }
  },

  getAllJobCandidates: async () => {
    try {
      const [linksRes, jobsRes] = await Promise.all([
        repositories.jobCandidates.list({ limit: 10000 }),
        repositories.jobs.list({ limit: 10000 })
      ]);
      return { links: linksRes.data, jobs: jobsRes.data };
    } catch (e) {
      throw toAppError(e);
    }
  },

  getJobCandidates: async (jobId: string) => {
    try {
      const [linksRes, candidatesRes] = await Promise.all([
        repositories.jobCandidates.list({ limit: 1000 }),
        repositories.candidates.list({ limit: 1000 })
      ]);
      const links = linksRes.data;
      const candidates = candidatesRes.data;

      return links
        .filter(l => l.job_id === jobId)
        .map(l => ({
          ...l,
          candidate_name: candidates.find(c => c.id === l.candidate_id)?.name || 'Desconhecido'
        }));
    } catch (e) {
      throw toAppError(e);
    }
  }
};