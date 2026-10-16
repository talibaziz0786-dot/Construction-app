/**
 * Canonical API base URL resolution for the mobile app.
 *
 * Mirrors the normalization rules of `client/src/services/apiBase.ts` (single
 * source of truth for how a client reaches the backend) with one difference:
 * there is no dev-server proxy on mobile, so an unset base falls back to the
 * local API URL instead of a same-origin `/api` prefix.
 *
 * Configuration: set `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env`
 * (see `.env.example`).
 *   - Android emulator:  http://10.0.2.2:3000
 *   - iOS simulator:     http://localhost:3000
 *   - Physical device:   http://<your-computer-LAN-IP>:3000
 *   - Production:        https://<your-render-service>.onrender.com
 */
const RAW_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

/** Dev fallback used when no environment override is configured. */
export const DEV_FALLBACK_API_BASE = 'http://localhost:3000/api';

/** Normalized API base without a trailing slash. Never empty. */
export const API_BASE: string = normalizeApiBase(RAW_BASE);

export function normalizeApiBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (trimmed === '') return DEV_FALLBACK_API_BASE;
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

/**
 * Builds an absolute URL for an API path.
 * Accepts both `/calculators` and `calculators`.
 */
export function apiUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${suffix}`;
}
