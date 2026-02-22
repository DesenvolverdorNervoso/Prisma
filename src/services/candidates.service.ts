import { repositories } from '../data/repositories';
import { Candidate } from '../domain/types';
import { toAppError, AppError } from './appError';
import { tagService } from './tag.service';
import { normalizePhone, validatePhone } from '../domain/validators';

export const candidatesService = {
  list: async (params?: any) => {
    try {
      return await repositories.candidates.list(params);
    } catch (e) {
      throw toAppError(e);
    }
  },

  createOrUpdateByWhatsapp: async (data: Partial<Candidate>, origin: 'Link' | 'Interno' = 'Interno'): Promise<{ candidate: Candidate, isUpdate: boolean }> => {
    try {
      if (!data.whatsapp || !validatePhone(data.whatsapp)) {
        throw new AppError("WhatsApp inválido. Mínimo 10 dígitos.", 'VALIDATION');
      }

      const cleanWhatsapp = normalizePhone(data.whatsapp);
      
      // Search for existing candidate by whatsapp in this tenant
      // We use list with filter to find it
      const res = await repositories.candidates.list({ limit: 1, filters: { whatsapp: cleanWhatsapp } });
      const existingCandidate = res.data[0];

      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      const defaultTag = await tagService.ensureDefaultTag('candidate');
      
      const commonFields: Partial<Candidate> = {
        ...data,
        whatsapp: cleanWhatsapp,
        profile_expires_at: expiresAt,
        origin: existingCandidate ? existingCandidate.origin : origin,
        status: existingCandidate ? existingCandidate.status : 'Novo'
      };

      // Ensure default tag is present
      const currentTags = data.tags || (existingCandidate?.tags) || [];
      commonFields.tags = Array.from(new Set([...currentTags, defaultTag]));

      if (existingCandidate) {
        // If it's a public form update, we might want to force origin to 'Link' or keep it?
        // Request says: "registrar origem=Link se aplicável"
        if (origin === 'Link') commonFields.origin = 'Link';

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

  create: async (data: Partial<Candidate>): Promise<Candidate> => {
    const result = await candidatesService.createOrUpdateByWhatsapp(data, 'Interno');
    return result.candidate;
  },

  createFromPublicForm: async (data: Partial<Candidate>): Promise<{ candidate: Candidate, isUpdate: boolean }> => {
    return await candidatesService.createOrUpdateByWhatsapp(data, 'Link');
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
      // 1. Check Dependencies (Job Candidates)
      const hasApplications = await repositories.jobCandidates.exists({ candidate_id: id });
      if (hasApplications) {
        throw new AppError("Não é possível excluir o candidato: existem candidaturas vinculadas. Remova o candidato das vagas primeiro.", 'CONFLICT');
      }

      await repositories.candidates.remove(id);
    } catch (e) {
      throw toAppError(e);
    }
  }
};
