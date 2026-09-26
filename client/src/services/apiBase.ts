/**
 * Canonical API base URL resolution — the single source of truth for how the
 * client reaches the backend.
 *
 * Deployment reality: the frontend and the API are hosted on different origins
 * (static frontend + separate API host). Every request therefore has to be
 * built from this base. When `VITE_API_BASE_URL` is unset the client falls back
 * to the same-origin `/api` prefix (used by the Vite dev proxy).
 *
 * A wrong base silently returns the frontend's HTML shell (HTTP 200) instead of
 * JSON, which previously surfaced as an empty/broken screen. Keeping one helper
 * means every caller is fixed at once and cannot drift.
 */
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

/** Normalized API base without a trailing slash. Never empty. */
export const API_BASE: string = normalizeApiBase(RAW_BASE);

export function normalizeApiBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (trimmed === '') return '/api';
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

/**
 * Builds an absolute (or same-origin) URL for an API path.
 * Accepts both `/calculators` and `calculators`.
 */
export function apiUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${suffix}`;
}
