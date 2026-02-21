import { repositories } from '../data/repositories';
import { Candidate } from '../domain/types';
import { DomainError, ErrorCodes } from '../domain/errors';
import { tagService } from './tag.service';

export const candidatesService = {
  list: (params?: any) => repositories.candidates.list(params),

  createInternal: async (data: Partial<Candidate>): Promise<Candidate> => {
    return candidatesService.upsertCandidate(data, 'Interno');
  },

  createFromPublicForm: async (data: Partial<Candidate>): Promise<{ candidate: Candidate, isUpdate: boolean }> => {
    const result = await candidatesService.upsertCandidate(data, 'Link');
    return { candidate: result, isUpdate: result.created_at !== result.updated_at }; // Simple check if updated
  },

  upsertCandidate: async (data: Partial<Candidate>, origin: 'Interno' | 'Link'): Promise<Candidate> => {
    // 1. Check Duplication via WhatsApp
    const res = await repositories.candidates.list({ limit: 10000 });
    const existingCandidate = res.data.find(c => c.whatsapp === data.whatsapp);

    // 2. Expiration Logic (90 days from now)
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const commonFields: Partial<Candidate> = {
      ...data,
      profile_expires_at: expiresAt,
      origin: origin,
      status: 'Novo'
    };

    if (existingCandidate) {
      if (origin === 'Interno') {
        throw new DomainError("Já existe um candidato com este WhatsApp.", ErrorCodes.DUPLICATE_ENTRY);
      }
      // Public form allows update
      const defaultTag = await tagService.ensureDefaultTag('candidate');
      const updatedLabels = Array.from(new Set([...(existingCandidate.labels || []), ...(data.labels || []), defaultTag]));
      return await repositories.candidates.update(existingCandidate.id, { 
        ...commonFields, 
        labels: updatedLabels,
        updated_at: new Date().toISOString() // Force update time
      });
    }

    // Create New (Tagging is handled by repository beforeCreate hook)
    return await repositories.candidates.create(commonFields);
  },

  update: async (id: string, data: Partial<Candidate>): Promise<Candidate> => {
    return await repositories.candidates.update(id, data);
  },

  delete: async (id: string): Promise<void> => {
    const candidate = await repositories.candidates.get(id);
    if (!candidate) throw new DomainError("Candidato não encontrado.", ErrorCodes.NOT_FOUND);

    const activeStatuses = ['Em análise', 'Encaminhado'];
    if (activeStatuses.includes(candidate.status)) {
      throw new DomainError(`Não é possível excluir: O candidato está em processo ativo (${candidate.status}).`, ErrorCodes.dependency('JOB_PROCESS'));
    }

    await repositories.candidates.remove(id);
  }
};