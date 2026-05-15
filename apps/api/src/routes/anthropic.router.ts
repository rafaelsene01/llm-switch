import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { anthropicMessages } from '../controllers/anthropic-messages.controller';

export function createAnthropicRouter(): Router {
  const router = Router();
  router.post('/messages', authMiddleware, anthropicMessages);
  return router;
}
