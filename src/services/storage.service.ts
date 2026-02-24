import { supabase } from '../lib/supabaseClient';
import { profileService } from './profile.service';
import { ENV } from '../config/env';

/**
 * Simple wrapper around IndexedDB to store files (Blobs) locally.
 * This avoids LocalStorage limits (5MB) and allows for larger file uploads.
 */
const DB_NAME = 'PrismaRH_Storage';
const STORE_NAME = 'files';
const DB_VERSION = 1;

export interface StoredFile {
  id: string;
  blob: Blob;
  name: string;
  type: string;
  created_at: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const storageService = {
  // --- Supabase Storage Methods ---
  
  uploadCurriculo: async (file: File, tenantId: string, candidateId: string): Promise<{ path: string }> => {
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const path = `${tenantId}/${candidateId}/${Date.now()}-${safeFileName}`;

    const { data, error } = await supabase.storage
      .from('curriculos')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) {
      console.error('Supabase Storage Upload Error:', error);
      throw new Error('Falha ao fazer upload do currículo no Supabase.');
    }

    return { path: data.path };
  },

  getSignedUrl: async (path: string, expiresIn = 60): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('curriculos')
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Supabase Storage Signed URL Error:', error);
      return null;
    }

    return data.signedUrl;
  },

  removeByPath: async (path: string): Promise<void> => {
    const { error } = await supabase.storage
      .from('curriculos')
      .remove([path]);

    if (error) {
      console.error('Supabase Storage Remove Error:', error);
      throw new Error('Falha ao remover arquivo do Supabase.');
    }
  },

  // --- IndexedDB Methods (Fallback) ---

  saveFile: async (file: File): Promise<{ url: string; id: string; name: string; type: string }> => {
    const db = await openDB();
    const id = crypto.randomUUID();
    
    const storedFile: StoredFile = {
      id,
      blob: file,
      name: file.name,
      type: file.type,
      created_at: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(storedFile);

      request.onsuccess = () => {
        // Create a temporary object URL for immediate preview
        const url = URL.createObjectURL(file);
        resolve({ url, id, name: file.name, type: file.type });
      };

      request.onerror = () => reject(request.error);
    });
  },

  getFile: async (id: string): Promise<string | null> => {
    // Fallback to IndexedDB for other files
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const file = request.result as StoredFile;
        if (file && file.blob) {
          resolve(URL.createObjectURL(file.blob));
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  },

  removeFile: async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Legacy methods kept for compatibility if needed, but updated to use new logic
  uploadResume: async (candidateId: string, file: File): Promise<{ path: string; url: string }> => {
    if (ENV.USE_SUPABASE) {
      const profile = await profileService.getCurrentProfile();
      if (!profile?.tenant_id) {
        throw new Error('Tenant ID não encontrado para upload de currículo.');
      }

      const { path } = await storageService.uploadCurriculo(file, profile.tenant_id, candidateId);
      const url = await storageService.getSignedUrl(path) || '';

      return { path, url };
    } else {
      // Fallback to IndexedDB
      const { id, url } = await storageService.saveFile(file);
      return { path: id, url };
    }
  },

  removeResume: async (path: string): Promise<void> => {
    if (ENV.USE_SUPABASE) {
      await storageService.removeByPath(path);
    } else {
      await storageService.removeFile(path);
    }
  }
};
