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
  }
};