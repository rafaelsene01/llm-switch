import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';
import { chatCompletions } from '../controllers/chat.controller';

export function createChatRouter(): Router {
  const router = Router();
  router.post('/chat/completions', authMiddleware, rateLimitMiddleware, chatCompletions);
  return router;
}
