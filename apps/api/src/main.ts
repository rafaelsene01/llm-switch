import 'dotenv/config';
import { mkdirSync } from 'fs';
import { createApp } from './app';
import { env } from './config/env';
import logger from './utils/logger';

mkdirSync('data', { recursive: true });
mkdirSync('logs', { recursive: true });

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`LLM Switch running on port ${env.PORT}`);
});
