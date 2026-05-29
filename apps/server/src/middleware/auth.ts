import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'go-music-dev-secret-key-change-in-production';
export type AppRole = 'user' | 'staff' | 'admin';

export function canManageContent(role?: string) {
  return role === 'admin' || role === 'staff';
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

type JwtUserClaims = {
  userId?: string;
  sub?: string;
  email?: string;
  role?: string;
  app_metadata?: {
    role?: string;
  };
  user_metadata?: {
    role?: string;
  };
};

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserClaims;
    req.user = {
      userId: decoded.userId || decoded.sub || '',
      email: decoded.email || '',
      role: decoded.app_metadata?.role || decoded.user_metadata?.role || decoded.role || 'user',
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
}

export function isAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access only' });
  }
  next();
}

export function isContentStaff(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || !canManageContent(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Staff access only' });
  }
  next();
}
