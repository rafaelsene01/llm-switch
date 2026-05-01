import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';
import { listModels, retrieveModel } from '../controllers/models.controller';

export function createModelsRouter(): Router {
  const router = Router();
  router.get('/models', authMiddleware, rateLimitMiddleware, listModels);
  router.get('/models/:model_id', authMiddleware, rateLimitMiddleware, retrieveModel);
  return router;
}
