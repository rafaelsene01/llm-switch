import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { createEmbeddings } from '../controllers/embeddings.controller';

export function createEmbeddingsRouter(): Router {
  const router = Router();
  router.post('/embeddings', authMiddleware, createEmbeddings);
  return router;
}
