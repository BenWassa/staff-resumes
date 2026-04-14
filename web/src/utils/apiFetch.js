/**
 * Thin wrapper around fetch() for the local FastAPI backend.
 */
export async function apiFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      'Content-Type': 'application/json',
    },
  });
}
