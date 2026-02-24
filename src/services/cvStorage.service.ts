import { supabase } from '../lib/supabaseClient';

export const cvStorageService = {
  /**
   * Uploads a resume to Supabase Storage
   * Path pattern: ${tenantId}/candidates/${candidateId}/${uuid}-${file.name}
   */
  uploadCV: async (file: File, tenantId: string, candidateId: string): Promise<{ path: string }> => {
    const uuid = crypto.randomUUID();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const path = `${tenantId}/candidates/${candidateId}/${uuid}-${safeFileName}`;

    const { data, error } = await supabase.storage
      .from('curriculos')
      .upload(path, file, { 
        upsert: true, 
        contentType: file.type,
        cacheControl: '3600'
      });

    if (error) {
      console.error('Supabase Storage Upload Error:', error);
      throw error; // Let the component handle the specific error message
    }

    return { path: data.path };
  },

  /**
   * Generates a signed URL for viewing/downloading the resume
   */
  getSignedUrl: async (path: string, expiresIn = 600): Promise<string | null> => {
    if (!path) return null;
    
    const { data, error } = await supabase.storage
      .from('curriculos')
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Supabase Storage Signed URL Error:', error);
      return null;
    }

    return data.signedUrl;
  },

  /**
   * Removes a file from storage
   */
  removeCV: async (path: string): Promise<void> => {
    if (!path) return;
    
    const { error } = await supabase.storage
      .from('curriculos')
      .remove([path]);

    if (error) {
      console.error('Supabase Storage Remove Error:', error);
      throw error;
    }
  }
};
