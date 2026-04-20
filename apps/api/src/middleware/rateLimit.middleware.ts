import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { env } from '../config/env';

export const rateLimitMiddleware = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  keyGenerator: (req: Request) => req.clientLabel || req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res) => {
    res.status(429).json({
      error: {
        message: `Limite de requisições atingido para "${req.clientLabel}". Tente novamente em breve.`,
        type: 'rate_limit_exceeded',
        retry_after_ms: env.RATE_LIMIT_WINDOW_MS,
      },
    });
  },
});
