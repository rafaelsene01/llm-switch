import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import os from 'os';
import { createAdminRoute } from './routes/admin.router';
import { createChatRouter } from './routes/chat.router';
import { createModelsRouter } from './routes/models.router';
import { createEmbeddingsRouter } from './routes/embeddings.router';
import { createAnthropicRouter } from './routes/anthropic.router';
import { errorHandler } from './middleware/errorHandler.middleware';
import logger from './utils/logger';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan(':method :url :status :response-time ms :res[content-length]', {
    stream: { write: (msg) => logger.info(msg.trim(), { source: 'http' }) },
  }));

  app.get('/health', (_req, res) => {
    const mem = process.memoryUsage();
    const toMB = (b: number) => Math.round(b / 1024 / 1024 * 10) / 10;
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      node: process.version,
      memory: {
        rss: toMB(mem.rss),
        heapUsed: toMB(mem.heapUsed),
        heapTotal: toMB(mem.heapTotal),
      },
      load: os.loadavg().map((n) => Math.round(n * 100) / 100),
    });
  });

  app.use('/admin', createAdminRoute());
  app.use('/v1', createChatRouter());
  app.use('/v1', createModelsRouter());
  app.use('/v1', createEmbeddingsRouter());
  app.use('/v1', createAnthropicRouter());

  app.use(errorHandler);

  return app;
}
