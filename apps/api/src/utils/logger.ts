import { createLogger, format, transports } from 'winston';
import path from 'path';
import { env } from '../config/env';

const logger = createLogger({
  level: env.LOG_LEVEL,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? '\n' + JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}] ${message}${metaStr}`;
        })
      ),
    }),
    new transports.File({
      filename: path.resolve('logs/audit.log'),
      level: 'info',
    }),
  ],
});

export interface LogRequestOptions {
  requestId: string;
  clientLabel: string;
  providerModel: string;
  originalMessages: unknown[];
  responseTokens?: number;
  durationMs: number;
  error?: Error;
}

export function logRequest(opts: LogRequestOptions): void {
  const entry = {
    requestId: opts.requestId,
    client: opts.clientLabel,
    provider: opts.providerModel,
    messagesCount: opts.originalMessages.length,
    responseTokens: opts.responseTokens,
    durationMs: opts.durationMs,
  };

  if (opts.error) {
    logger.error('request_failed', { ...entry, error: opts.error.message });
  } else {
    logger.info('request_ok', entry);
  }
}

export default logger;
