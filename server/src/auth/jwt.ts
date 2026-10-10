import jwt from 'jsonwebtoken';

/**
 * Canonical JWT signing secret.
 *
 * `server.ts` refuses to boot in production without `JWT_SECRET`, so the
 * development/test fallback below is unreachable in a real deployment.
 * Centralizing the lookup keeps every sign/verify call site consistent and
 * makes a missing production secret fail loudly instead of silently using a
 * known default.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return 'default-secret-change-in-production';
}

export function signAuthToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyAuthToken<T = { userId: string; email: string }>(token: string): T {
  return jwt.verify(token, getJwtSecret()) as T;
}
