import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { UserModel, hashPassword, IUser } from './user.model.js';
import { signAuthToken, verifyAuthToken } from './jwt.js';

const router = Router();

const AUTH_COOKIE = 'auth-token';

function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      return res.status(400).json({ error: 'Validation failed', details });
    }

    const { name, email, password } = parsed.data;

    // Check if user exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await UserModel.create({
      name,
      email,
      passwordHash,
    });

    // Generate JWT
    const token = signAuthToken({ userId: String(user._id), email: user.email });

    // Set secure cookie
    res.cookie(AUTH_COOKIE, token, authCookieOptions());

    // Return user data (without password)
    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: unknown) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      return res.status(400).json({ error: 'Validation failed', details });
    }

    const { email, password } = parsed.data;

    // Find user with password hash
    const user = await UserModel.findOne({ email }).select('+passwordHash');
    if (!user) {
      // Use generic message to prevent account enumeration
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = signAuthToken({ userId: String(user._id), email: user.email });

    // Set secure cookie
    res.cookie(AUTH_COOKIE, token, authCookieOptions());

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  });
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.[AUTH_COOKIE];
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const payload = verifyAuthToken<{ userId: string }>(token);
    const user = await UserModel.findById(payload.userId).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: unknown) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;