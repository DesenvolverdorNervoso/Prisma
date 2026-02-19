import { repositories } from '../data/repositories';
import { Candidate } from '../domain/types';
import { DomainError, ErrorCodes } from '../domain/errors';

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
    // 1. Ensure Tag
    let labelId: string;
    const labelRes = await repositories.labels.list({ limit: 1000 });
    const existingLabel = labelRes.data.find(l => l.name === 'Candidatos Banco de Dados' && l.entityType === 'candidate');
    
    if (existingLabel) {
      labelId = existingLabel.id;
    } else {
      const newLabel = await repositories.labels.create({
        name: 'Candidatos Banco de Dados',
        entityType: 'candidate',
        color: '#bbf7d0'
      });
      labelId = newLabel.id;
    }

    // 2. Check Duplication via WhatsApp
    const res = await repositories.candidates.list({ limit: 10000 });
    const existingCandidate = res.data.find(c => c.whatsapp === data.whatsapp);

    // 3. Expiration Logic (90 days from now)
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
      const updatedLabels = Array.from(new Set([...(existingCandidate.labels || []), ...(data.labels || []), labelId]));
      return await repositories.candidates.update(existingCandidate.id, { 
        ...commonFields, 
        labels: updatedLabels,
        updated_at: new Date().toISOString() // Force update time
      });
    }

    // Create New
    const labels = data.labels || [];
    if (!labels.includes(labelId)) labels.push(labelId);

    return await repositories.candidates.create({ ...commonFields, labels });
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