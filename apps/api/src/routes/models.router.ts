import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { listModels, retrieveModel } from '../controllers/models.controller';

export function createModelsRouter(): Router {
  const router = Router();
  router.get('/models', authMiddleware, listModels);
  router.get('/models/:model_id', authMiddleware, retrieveModel);
  return router;
}
