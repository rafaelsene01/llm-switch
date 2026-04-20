import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createAdminRoute } from './routes/admin.router';
import { createChatRouter } from './routes/chat.router';
import { createModelsRouter } from './routes/models.router';
import { errorHandler } from './middleware/errorHandler.middleware';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('combined'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/admin', createAdminRoute());
  app.use('/v1', createChatRouter());
  app.use('/v1', createModelsRouter());

  app.use(errorHandler);

  return app;
}
