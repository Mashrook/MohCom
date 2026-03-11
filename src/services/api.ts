// src/services/api.ts
import { cacheService } from './cache';

type ApiOptions = {
  cacheKey?: string;
  cacheTTL?: number; // milliseconds
  timeoutMs?: number;
  retry?: number;
};

const DEFAULT_TIMEOUT = 15000;

async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(id);
  }
}

export async function apiFetch<T>(
  url: string,
  options: ApiOptions & RequestInit = {}
): Promise<T> {
  const {
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    timeoutMs = DEFAULT_TIMEOUT,
    retry = 1,
    ...fetchOptions
  } = options;

  // 1) Try cache first
  if (cacheKey) {
    const cached = cacheService.get<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retry) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(fetchOptions.headers || {}),
          },
          ...fetchOptions,
        },
        timeoutMs
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: T = await response.json();

      // 2) Save to cache
      if (cacheKey) {
        cacheService.set(cacheKey, data);
      }

      return data;
    } catch (err) {
      lastError = err;
      attempt++;
      if (attempt > retry) break;
    }
  }

  // 3) Fallback to cache if exists
  if (cacheKey) {
    const cached = cacheService.get<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  throw lastError;
}

