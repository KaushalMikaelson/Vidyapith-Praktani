import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isBlocked } from '../utils/tokenBlocklist.js';

const JWT_SECRET = process.env.JWT_SECRET || 'vidyapith-connect-secret-key';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    jti?: string;
  };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access denied. No active token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
      jti?: string;
    };

    // Check if this token has been revoked (logout blocklist)
    if (decoded.jti) {
      const blocked = await isBlocked(decoded.jti);
      if (blocked) {
        res.status(401).json({ error: 'Session has been terminated. Please log in again.' });
        return;
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token credentials.' });
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied. Administrative credentials required.' });
      return;
    }
    next();
  });
};
