const PREFIX = 'cache:';

export const cacheService = {
  set<T>(key: string, data: T, maxAgeMs = 5 * 60 * 1000) {
    try {
      const payload = {
        timestamp: Date.now(),
        maxAgeMs,
        data,
      };
      localStorage.setItem(PREFIX + key, JSON.stringify(payload));
    } catch (e) {
      console.error('Cache set error', e);
    }
  },

  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp > parsed.maxAgeMs) {
        this.remove(key);
        return null;
      }

      return parsed.data as T;
    } catch (e) {
      console.error('Cache get error', e);
      return null;
    }
  },

  remove(key: string) {
    localStorage.removeItem(PREFIX + key);
  },

  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  },
};

