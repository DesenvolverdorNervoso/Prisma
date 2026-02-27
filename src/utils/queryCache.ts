
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise: Promise<T>;
}

const cache = new Map<string, CacheEntry<any>>();
const activeRequests = new Map<string, Promise<any>>();

export const queryCache = {
  /**
   * Fetches data, caching the result and deduplicating concurrent requests.
   * @param key Unique identifier for the cached data.
   * @param fetcher Function that returns a Promise for the data.
   * @param ttl Time-to-live for the cache entry in milliseconds (default: 60000ms = 1 minute).
   * @returns A Promise that resolves with the data.
   */
  fetch: async <T>(key: string, fetcher: () => Promise<T>, ttl: number = 60000): Promise<T> => {
    const now = Date.now();
    const cached = cache.get(key);

    // If cached data exists and is not expired, return it immediately.
    if (cached && (now - cached.timestamp < ttl)) {
      return cached.data;
    }

    // If there's an active request for this key, return that promise.
    if (activeRequests.has(key)) {
      return activeRequests.get(key) as Promise<T>;
    }

    // If cached data exists but is expired, return it but revalidate in background.
    if (cached && (now - cached.timestamp >= ttl)) {
      const backgroundRefreshPromise = (async () => {
        try {
          const data = await fetcher();
          cache.set(key, { data, timestamp: Date.now(), promise: Promise.resolve(data) });
          activeRequests.delete(key);
          return data;
        } catch (error) {
          activeRequests.delete(key);
          throw error;
        }
      })();
      activeRequests.set(key, backgroundRefreshPromise);
      return cached.data; // Return stale data immediately
    }

    // No cached data, no active request. Fetch new data.
    const requestPromise = (async () => {
      try {
        const data = await fetcher();
        cache.set(key, { data, timestamp: Date.now(), promise: Promise.resolve(data) });
        activeRequests.delete(key);
        return data;
      } catch (error) {
        activeRequests.delete(key);
        throw error;
      }
    })();

    activeRequests.set(key, requestPromise);
    return requestPromise;
  },

  /**
   * Invalidates a specific cache entry.
   * @param key The key of the cache entry to invalidate.
   */
  invalidate: (key: string) => {
    cache.delete(key);
    activeRequests.delete(key);
  },

  /**
   * Clears all cache entries.
   */
  clearAll: () => {
    cache.clear();
    activeRequests.clear();
  }
};
