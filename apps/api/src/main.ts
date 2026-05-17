import './telemetry';
import 'dotenv/config';
import { mkdirSync } from 'fs';
import { createApp } from './app';
import { env } from './config/env';
import logger from './utils/logger';
import { tracer } from './telemetry';

mkdirSync('data', { recursive: true });
mkdirSync('logs', { recursive: true });

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`LLM Switch running on port ${env.PORT}`);
  const startupSpan = tracer.startSpan('app.startup');
  const traceId = startupSpan.spanContext().traceId;
  console.log(`[otel] startup span traceId: ${traceId} (all-zeros = SDK noop)`);
  startupSpan.end();
});
