import { repositories } from '../data/repositories';
import { Candidate } from '../domain/types';
import { toAppError, AppError } from './appError';
import { tagService } from './tag.service';
import { storageService } from './storage.service';
import { resumeUploadService } from './resume-upload.service';
import { supabase } from '../lib/supabaseClient';
import { tenantService } from './tenant.service';

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

  saveInternalWithResume: async (data: Partial<Candidate>, resumeFile?: File): Promise<Candidate> => {
    try {
      const tenantId = await tenantService.requireTenantId();
      let candidate: Candidate;

      // PASSO 1: Criar ou atualizar candidato sem currículo
      // Remove legacy fields and the file metadata from initial save to ensure clean insert/update
      const { 
        cv_url, cv_path, cv_name, cv_mime, 
        resume_file_path, resume_url, resume_file_url,
        resume_path, resume_file_name, resume_mime, resume_size,
        resume_file_type,
        ...cleanData 
      } = data;

      if (data.id) {
        candidate = await candidatesService.update(data.id, cleanData);
      } else {
        candidate = await candidatesService.createInternal({ ...cleanData, tenant_id: tenantId });
      }

      // PASSO 2: Se houver currículo, fazer upload
      if (resumeFile) {
        let uploadResult;
        try {
          uploadResult = await resumeUploadService.uploadResumeInternal(resumeFile, tenantId, candidate.id);
        } catch (uploadErr: any) {
          console.error('Upload error in service:', uploadErr);
          throw new AppError('Falha ao enviar currículo', 'STORAGE_ERROR');
        }

        // PASSO 3: Atualizar o candidato com os metadados corretos
        if (uploadResult) {
          try {
            const { error: updateError } = await supabase
              .from('candidates')
              .update({
                resume_path: uploadResult.path,
                resume_file_name: uploadResult.name,
                resume_mime: uploadResult.mime,
                resume_size: uploadResult.size
              })
              .eq('id', candidate.id);

            if (updateError) throw updateError;
            
            // Refresh candidate data
            candidate = { 
              ...candidate, 
              resume_path: uploadResult.path,
              resume_file_name: uploadResult.name,
              resume_mime: uploadResult.mime,
              resume_size: uploadResult.size
            };
          } catch (updateErr: any) {
            console.error('Update resume metadata error:', updateErr);
            throw new AppError('Falha ao vincular currículo ao candidato', 'DB_ERROR');
          }
        }
      }

      return candidate;
    } catch (e) {
      throw toAppError(e);
    }
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
      // Standardizing on: resume_path, resume_file_name, resume_mime, resume_size
      const { 
        resume_file_url, resume_file_type, resume_file_path,
        cv_url, cv_path, cv_name, cv_mime,
        instagram,
        ...cleanData 
      } = data;

      const commonFields: Partial<Candidate> = {
        ...cleanData,
        instagram,
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
      // Standardizing on: resume_path, resume_file_name, resume_mime, resume_size
      const { 
        resume_file_url, resume_file_type, resume_file_path,
        cv_url, cv_path, cv_name, cv_mime,
        instagram,
        ...cleanData 
      } = data;

      const payload = {
        ...cleanData,
        instagram
      };

      return await repositories.candidates.update(id, payload);
    } catch (e) {
      throw toAppError(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      const candidate = await repositories.candidates.get(id);
      if (!candidate) throw new AppError("Candidato não encontrado.", 'NOT_FOUND');

      const activeStatuses = ['Triagem', 'Entrevista', 'Em teste', 'Encaminhado', 'Aprovado'];
      if (activeStatuses.includes(candidate.status) || candidate.is_working) {
        throw new AppError(`Não é possível excluir: O candidato está em processo ativo ou trabalhando (${candidate.status}).`, 'DEPENDENCY_ERROR');
      }

      await repositories.candidates.remove(id);

      // Deletar currículo do storage se existir
      const pathToDelete = candidate.cv_path || candidate.cv_url || candidate.resume_path;
      if (pathToDelete && !pathToDelete.startsWith('http')) {
        try {
          await storageService.removeByPath(pathToDelete);
        } catch (storageErr) {
          console.error("Erro ao remover currículo do storage durante exclusão do candidato:", storageErr);
          // Não falha a exclusão do candidato se o storage falhar
        }
      }
    } catch (e) {
      throw toAppError(e);
    }
  }
};
