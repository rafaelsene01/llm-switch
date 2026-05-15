import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { chatCompletions } from '../controllers/chat.controller';

export function createChatRouter(): Router {
  const router = Router();
  router.post('/chat/completions', authMiddleware, chatCompletions);
  return router;
}
