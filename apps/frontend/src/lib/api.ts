/**
 * Central fetch wrapper for all backend API calls.
 * Automatically injects the API secret header when NEXT_PUBLIC_API_SECRET is set.
 * All service files should import `apiFetch` instead of calling `fetch` directly.
 */

const secret = process.env.NEXT_PUBLIC_API_SECRET;

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (secret) {
    headers.set('x-api-secret', secret);
  }
  return fetch(input, { ...init, headers });
}
