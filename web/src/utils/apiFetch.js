/**
 * Thin wrapper around fetch() for the local FastAPI backend.
 */
const DEV_API_BASE = 'http://localhost:8012';

function resolveApiUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;

  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
  const base = configuredBase || (import.meta.env.DEV ? DEV_API_BASE : '');

  if (!base) return url;

  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${base.replace(/\/+$/, '')}${normalizedPath}`;
}

export async function apiFetch(url, options = {}) {
  return fetch(resolveApiUrl(url), {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      'Content-Type': 'application/json',
    },
  });
}
