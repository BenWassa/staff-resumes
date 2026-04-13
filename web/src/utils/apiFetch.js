/**
 * Wrapper around fetch() that automatically attaches the Firebase ID token
 * as a Bearer header on every request.
 *
 * Usage: same signature as fetch(url, options)
 * On 401: forces a token refresh and retries once before redirecting to /login.
 */

import { auth } from "../firebase";

export async function apiFetch(url, options = {}) {
  const token = await _getToken();
  const response = await _fetchWithToken(url, options, token);

  if (response.status === 401) {
    // Token may have expired — force refresh and retry once
    const freshToken = await _getToken(true);
    const retry = await _fetchWithToken(url, options, freshToken);
    if (retry.status === 401) {
      // Still unauthorized — send to login
      window.location.href = "/login";
      return retry;
    }
    return retry;
  }

  return response;
}

async function _getToken(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) {
    window.location.href = "/login";
    throw new Error("Not authenticated");
  }
  return user.getIdToken(forceRefresh);
}

function _fetchWithToken(url, options, token) {
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}
