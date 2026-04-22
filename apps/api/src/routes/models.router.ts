import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';
import { listModels, listRules } from '../controllers/models.controller';

export function createModelsRouter(): Router {
  const router = Router();
  router.get('/models', authMiddleware, rateLimitMiddleware, listModels);
  router.get('/gateway/rules', authMiddleware, rateLimitMiddleware, listRules);
  return router;
}
