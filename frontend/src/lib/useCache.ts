import { useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
}

const defaultConfig: CacheConfig = {
  ttl: 15 * 60 * 1000, // 15 minutes default
};

export function useCache<T>(config: Partial<CacheConfig> = {}) {
  const { ttl } = { ...defaultConfig, ...config };
  const cache = useRef<Map<string, CacheEntry<T>>>(new Map());

  const get = useCallback((key: string): T | null => {
    const entry = cache.current.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > ttl;
    if (isExpired) {
      cache.current.delete(key);
      return null;
    }

    return entry.data;
  }, [ttl]);

  const set = useCallback((key: string, data: T): void => {
    cache.current.set(key, {
      data,
      timestamp: Date.now(),
    });
  }, []);

  const clear = useCallback((key?: string): void => {
    if (key) {
      cache.current.delete(key);
    } else {
      cache.current.clear();
    }
  }, []);

  const has = useCallback((key: string): boolean => {
    return get(key) !== null;
  }, [get]);

  return { get, set, clear, has };
}

// Simple cache for API calls
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: Partial<CacheConfig> = {}
): Promise<T> {
  const { ttl } = { ...defaultConfig, ...config };
  const cacheKey = `cache_${key}`;

  // Check cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const entry = JSON.parse(cached) as CacheEntry<T>;
      const isExpired = Date.now() - entry.timestamp > ttl;
      if (!isExpired) {
        return entry.data;
      }
    }
  } catch {
    // Ignore cache errors
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now(),
    } as CacheEntry<T>));
  } catch {
    // Ignore cache errors (e.g., quota exceeded)
  }

  return data;
}