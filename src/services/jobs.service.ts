import { repositories } from '../data/repositories';
import { Job, JobCandidateStatus, JobCandidate } from '../domain/types';
import { toAppError, AppError } from './appError';

export const jobsService = {
  list: async (params?: any) => {
    try {
      return await repositories.jobs.list(params);
    } catch (e) {
      throw toAppError(e);
    }
  },

  create: async (data: Partial<Job>): Promise<Job> => {
    try {
      if (!data.requirements_list || data.requirements_list.length === 0) {
         // Allow legacy requirements string if list is empty
         if (!data.requirements?.trim()) {
             throw new AppError("A vaga deve ter pelo menos um requisito.", 'VALIDATION');
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

  delete: async (id: string, options?: { force?: boolean }): Promise<void> => {
    try {
      // Check if there are candidates
      const hasCandidates = await repositories.jobCandidates.exists({ job_id: id });
      
      if (hasCandidates) {
        if (!options?.force) {
          throw new AppError(`Esta vaga possui candidatos vinculados. Remova os vínculos antes de excluir ou use a exclusão forçada.`, 'CONFLICT');
        }
        
        // Logical cascade: delete links first
        // We need to find all links and delete them
        const links = await repositories.jobCandidates.list({ limit: 1000, filters: { job_id: id } });
        for (const link of links.data) {
          await repositories.jobCandidates.remove(link.id);
        }
      }
      
      await repositories.jobs.remove(id);
    } catch (e) {
      throw toAppError(e);
    }
  },

  addCandidateToJob: async (jobId: string, candidateId: string) => {
    try {
      const isLinked = await repositories.jobCandidates.exists({ job_id: jobId, candidate_id: candidateId });
      if (isLinked) {
        throw new AppError("Candidato já vinculado a esta vaga.", 'DUPLICATE_ENTRY');
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
      const candidate = await repositories.candidates.get(jobCandidate.candidate_id);
      if (!candidate) return;

      if (newStatus === 'Encaminhado ao cliente') {
        // Only update if not already Contratado
        if (candidate.status !== 'Contratado') {
          await repositories.candidates.update(jobCandidate.candidate_id, { status: 'Encaminhado' });
        }
      } else if (newStatus === 'Aprovado') {
        await repositories.candidates.update(jobCandidate.candidate_id, { status: 'Contratado' });
      }
    } catch (e) {
      throw toAppError(e);
    }
  },

  getJobCandidates: async (jobId: string) => {
    try {
      // This could be optimized with a join if Supabase allowed, but we follow the existing pattern
      const linksRes = await repositories.jobCandidates.list({ limit: 1000, filters: { job_id: jobId } });
      const candidatesRes = await repositories.candidates.list({ limit: 1000 });
      
      const links = linksRes.data;
      const candidates = candidatesRes.data;

      return links.map(l => ({
          ...l,
          candidate_name: candidates.find(c => c.id === l.candidate_id)?.name || 'Desconhecido'
        }));
    } catch (e) {
      throw toAppError(e);
    }
  }
};
