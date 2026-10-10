import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from './jwt.js';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

/**
 * Authentication middleware
 * Extracts user identity from JWT token in secure HTTP-only cookie
 * NEVER trusts userId from request body/params
 */
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.['auth-token'];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = verifyAuthToken(token);

    if (!payload.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Set user context (server-controlled, never client-trusted)
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch (error: unknown) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Optional auth middleware
 * Attaches user context if authenticated, but doesn't require it
 * Used for routes that work for both guest and authenticated users
 */
export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.['auth-token'];
    if (token) {
      const payload = verifyAuthToken(token);
      if (payload.userId) {
        req.userId = payload.userId;
        req.userEmail = payload.email;
      }
    }
  } catch (error) {
    // Silently fail - treat as guest
  }
  next();
};