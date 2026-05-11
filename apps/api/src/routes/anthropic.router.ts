import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';
import { anthropicMessages } from '../controllers/anthropic-messages.controller';

export function createAnthropicRouter(): Router {
  const router = Router();
  router.post('/messages', authMiddleware, rateLimitMiddleware, anthropicMessages);
  return router;
}
