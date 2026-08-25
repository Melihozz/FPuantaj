import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { login, getCurrentUser } from '../services/auth.service';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const authRouter = Router();

/**
 * Brute-force koruması: IP başına 15 dakikada 10 başarısız deneme.
 * Başarılı girişler sayaca yazılmaz, böylece normal kullanıcı engellenmez.
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      status: 429,
      code: 'TOO_MANY_REQUESTS',
      message: 'Çok fazla başarısız giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.',
    });
  },
});

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Kullanıcı adı zorunludur'),
  password: z.string().min(1, 'Şifre zorunludur'),
});

/**
 * POST /api/auth/login
 * Login with username and password
 */
authRouter.post('/login', loginRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Geçersiz giriş bilgileri', {
        fields: validation.error.errors.map(e => e.message),
      });
    }

    const { username, password } = validation.data;
    const result = await login(username, password);

    res.json({
      message: 'Giriş başarılı',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout current user (client-side token removal)
 */
authRouter.post('/logout', authenticate, (req: Request, res: Response) => {
  // JWT is stateless, so logout is handled client-side by removing the token
  // This endpoint exists for API consistency and potential future token blacklisting
  res.json({
    message: 'Çıkış başarılı',
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
authRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'NO_USER', 'Kimlik doğrulama gerekli');
    }

    const user = await getCurrentUser(req.user.userId);

    res.json({
      user,
    });
  } catch (error) {
    next(error);
  }
});
