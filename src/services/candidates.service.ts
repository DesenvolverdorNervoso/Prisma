import { repositories } from '../data/repositories';
import { Candidate } from '../domain/types';
import { toAppError, AppError } from './appError';
import { tagService } from './tag.service';

export const candidatesService = {
  list: async (params?: any) => {
    try {
      return await repositories.candidates.list(params);
    } catch (e) {
      throw toAppError(e);
    }
  },

  createInternal: async (data: Partial<Candidate>): Promise<Candidate> => {
    return await candidatesService.upsertCandidate(data, 'Interno');
  },

  createFromPublicForm: async (data: Partial<Candidate>): Promise<{ candidate: Candidate, isUpdate: boolean }> => {
    const result = await candidatesService.upsertCandidate(data, 'Link');
    return { candidate: result, isUpdate: result.created_at !== result.updated_at }; // Simple check if updated
  },

  upsertCandidate: async (data: Partial<Candidate>, origin: 'Interno' | 'Link'): Promise<Candidate> => {
    try {
      // 1. Check Duplication via WhatsApp
      const res = await repositories.candidates.list({ limit: 10000 });
      const existingCandidate = res.data.find(c => c.whatsapp === data.whatsapp);

      // 2. Expiration Logic (90 days from now)
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      // Filter only allowed fields to avoid DB errors with non-existent columns
      const { 
        resume_file_url, resume_path, resume_file_type, resume_file_name, resume_size, 
        ...cleanData 
      } = data;

      const commonFields: Partial<Candidate> = {
        ...cleanData,
        profile_expires_at: expiresAt,
        origin: origin,
        status: 'Novo'
      };

      if (existingCandidate) {
        if (origin === 'Interno') {
          throw new AppError("Já existe um candidato com este WhatsApp.", 'DUPLICATE_ENTRY');
        }
        // Public form allows update
        const defaultTag = await tagService.ensureDefaultTag('candidate');
        const updatedTags = Array.from(new Set([...(existingCandidate.tags || []), ...(data.tags || []), defaultTag]));
        return await repositories.candidates.update(existingCandidate.id, { 
          ...commonFields, 
          tags: updatedTags,
          updated_at: new Date().toISOString() // Force update time
        });
      }

      // Create New (Tagging is handled by repository beforeCreate hook)
      return await repositories.candidates.create(commonFields);
    } catch (e) {
      throw toAppError(e);
    }
  },

  update: async (id: string, data: Partial<Candidate>): Promise<Candidate> => {
    try {
      // Filter only allowed fields to avoid DB errors with non-existent columns
      const { 
        resume_file_url, resume_path, resume_file_type, resume_file_name, resume_size, 
        ...cleanData 
      } = data;

      return await repositories.candidates.update(id, cleanData);
    } catch (e) {
      throw toAppError(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      const candidate = await repositories.candidates.get(id);
      if (!candidate) throw new AppError("Candidato não encontrado.", 'NOT_FOUND');

      const activeStatuses = ['Em análise', 'Encaminhado'];
      if (activeStatuses.includes(candidate.status)) {
        throw new AppError(`Não é possível excluir: O candidato está em processo ativo (${candidate.status}).`, 'DEPENDENCY_ERROR');
      }

      await repositories.candidates.remove(id);
    } catch (e) {
      throw toAppError(e);
    }
  }
};
