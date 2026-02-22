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

  create: async (data: Partial<Candidate>): Promise<Candidate> => {
    try {
      // 1. Validations
      if (!data.whatsapp || data.whatsapp.replace(/\D/g, '').length < 10) {
        throw new AppError("WhatsApp inválido. Mínimo 10 dígitos.", 'VALIDATION');
      }
      if (!data.city) {
        throw new AppError("Cidade é obrigatória.", 'VALIDATION');
      }
      if (!data.category) {
        throw new AppError("Categoria é obrigatória.", 'VALIDATION');
      }

      // 2. Expiration Logic (90 days from now)
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      const candidateData: Partial<Candidate> = {
        ...data,
        profile_expires_at: expiresAt,
        origin: 'Interno',
        status: 'Novo'
      };

      // 3. Apply default tag
      const defaultTag = await tagService.ensureDefaultTag('candidate');
      candidateData.tags = Array.from(new Set([...(data.tags || []), defaultTag]));

      return await repositories.candidates.create(candidateData);
    } catch (e) {
      throw toAppError(e);
    }
  },

  createFromPublicForm: async (data: Partial<Candidate>): Promise<{ candidate: Candidate, isUpdate: boolean }> => {
    try {
      // Public form logic usually allows updates if WhatsApp exists
      const res = await repositories.candidates.list({ limit: 10000 });
      const existingCandidate = res.data.find(c => c.whatsapp === data.whatsapp);

      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      const commonFields: Partial<Candidate> = {
        ...data,
        profile_expires_at: expiresAt,
        origin: 'Link',
        status: 'Novo'
      };

      const defaultTag = await tagService.ensureDefaultTag('candidate');
      commonFields.tags = Array.from(new Set([...(data.tags || []), defaultTag]));

      if (existingCandidate) {
        const updated = await repositories.candidates.update(existingCandidate.id, {
          ...commonFields,
          updated_at: new Date().toISOString()
        });
        return { candidate: updated, isUpdate: true };
      }

      const created = await repositories.candidates.create(commonFields);
      return { candidate: created, isUpdate: false };
    } catch (e) {
      throw toAppError(e);
    }
  },

  update: async (id: string, data: Partial<Candidate>): Promise<Candidate> => {
    try {
      // Basic validation: don't allow clearing mandatory fields if they are in the patch
      if (data.whatsapp !== undefined && data.whatsapp.replace(/\D/g, '').length < 10) {
        throw new AppError("WhatsApp inválido. Mínimo 10 dígitos.", 'VALIDATION');
      }
      return await repositories.candidates.update(id, data);
    } catch (e) {
      throw toAppError(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await repositories.candidates.remove(id);
    } catch (e) {
      throw toAppError(e);
    }
  }
};
