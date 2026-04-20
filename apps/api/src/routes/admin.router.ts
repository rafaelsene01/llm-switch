import { Router } from 'express';
import { createAdminRouter } from '../controllers/admin.controller';

export function createAdminRoute(): Router {
  const router = Router();
  router.use('/', createAdminRouter());
  return router;
}
