import { supabase } from '../lib/supabaseClient';
import { supabaseUrl } from '../config/env';

export interface ResumeUploadResult {
  path: string;
  url?: string;
  name: string;
  size: number;
  mime: string;
}

export const resumeUploadService = {
  /**
   * Validates file size and type
   */
  validateFile: (file: File): { valid: boolean; error?: string } => {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'Arquivo muito grande. Envie até 5MB.' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Formato inválido. Use PDF, PNG ou JPG.' };
    }

    return { valid: true };
  },

  /**
   * Uploads a resume for authenticated users
   */
  uploadResumeInternal: async (file: File, tenantId: string, candidateId: string): Promise<ResumeUploadResult> => {
    const validation = resumeUploadService.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const path = `${tenantId}/candidates/${candidateId}/${Date.now()}_${sanitizedFileName}`;

    const { data, error } = await supabase.storage
      .from('resumes')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) {
      console.error('Internal Upload Error:', error);
      throw new Error('Falha no upload. Tente novamente.');
    }

    // Generate a signed URL for immediate preview (7 days)
    const { data: signedData } = await supabase.storage
      .from('resumes')
      .createSignedUrl(data.path, 60 * 60 * 24 * 7);

    return {
      path: data.path,
      url: signedData?.signedUrl,
      name: file.name,
      size: file.size,
      mime: file.type
    };
  },

  /**
   * Uploads a resume for public users via Edge Function
   */
  uploadResumePublic: async (file: File, tenantId: string, publicToken: string, candidateTempId: string): Promise<ResumeUploadResult> => {
    const validation = resumeUploadService.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('tenant_id', tenantId);
    formData.append('public_token', publicToken);
    formData.append('candidate_temp_id', candidateTempId);

    const response = await fetch(`${supabaseUrl}/functions/v1/upload-resume-from-link`, {
      method: 'POST',
      body: formData,
      // No headers needed for FormData, browser sets boundary
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Falha no upload. Tente novamente.');
    }

    return await response.json();
  },

  /**
   * Removes a resume from storage
   */
  removeResume: async (path: string): Promise<void> => {
    const { error } = await supabase.storage
      .from('resumes')
      .remove([path]);

    if (error) {
      console.error('Remove Error:', error);
      throw new Error('Erro ao remover currículo.');
    }
  }
};
