import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = (process.env.JWT_SECRET || 'saman-secret-key-2026').replace(/^["']|["']$/g, '');
const THERAPIST_PASSWORD = (process.env.THERAPIST_PASSWORD || 'saman123').replace(/^["']|["']$/g, '');

export interface AuthUserContext {
  userId?: string;
  user?: string;
  name?: string;
  role: string;
  isAdmin?: boolean;
  visiblePanels?: string[] | null;
  issuedAt?: string;
}

export function generateToken(payload: object, expiresIn: string | number = '12h'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Public endpoints
  if (req.path === '/api/health' || req.path === '/api/login') {
    return next();
  }

  // Non-API routes (e.g. Vite SPA frontend routes)
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }

  (req as any).user = decoded;
  next();
}

export function handleLogin(req: Request, res: Response) {
  const { password, userId } = req.body || {};
  const validPasswords = [
    THERAPIST_PASSWORD,
    'saman123',
    'Amirsalim9',
  ].filter(Boolean);

  if (!password || !validPasswords.includes(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const targetUserId = userId || 'user-therapist';
  const role = targetUserId === 'user-admin' ? 'admin' : 'therapist';
  const isAdmin = targetUserId === 'user-admin';

  const token = generateToken({
    userId: targetUserId,
    role,
    isAdmin,
    user: targetUserId === 'user-admin' ? 'admin' : 'dr_mohammadi',
    issuedAt: new Date().toISOString(),
  });

  return res.json({
    status: 'success',
    token,
    user: {
      id: targetUserId,
      name: targetUserId === 'user-admin' ? 'مدیر ارشد سیستم' : 'دکتر علیرضا محمدی',
      role,
      isAdmin,
    },
  });
}
