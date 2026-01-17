import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../services/auth.service';
import { AppError } from './errorHandler';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware to authenticate JWT token from Authorization header
 * Extracts token from "Bearer <token>" format
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError(401, 'NO_TOKEN', 'Kimlik doğrulama gerekli');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AppError(401, 'INVALID_TOKEN_FORMAT', 'Geçersiz token formatı');
    }

    const token = parts[1];
    const payload = verifyToken(token);

    // Attach user info to request
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to check if user has required role
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'NO_USER', 'Kimlik doğrulama gerekli'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'Bu işlem için yetkiniz yok'));
      return;
    }

    next();
  };
}

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for routes that work differently for authenticated users
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      req.user = verifyToken(token);
    }

    next();
  } catch (error) {
    // Ignore token errors for optional auth
    next();
  }
}
