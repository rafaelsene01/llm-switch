import { createLogger, format, transports } from 'winston';
import path from 'path';
import { env } from '../config/env';
import type { SanitizeFinding } from '../types';

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
    new transports.File({
      filename: path.resolve('logs/errors.log'),
      level: 'error',
    }),
  ],
});

export interface LogRequestOptions {
  requestId: string;
  clientLabel: string;
  providerModel: string;
  originalMessages: unknown[];
  sanitizedMessages: unknown[];
  sanitizationReport: SanitizeFinding[];
  responseTokens?: number;
  durationMs: number;
  blocked?: boolean;
  error?: Error;
}

export function logRequest(opts: LogRequestOptions): void {
  const hasSensitiveData = opts.sanitizationReport.length > 0;

  const entry = {
    requestId: opts.requestId,
    client: opts.clientLabel,
    provider: opts.providerModel,
    messagesCount: opts.sanitizedMessages.length,
    sensitiveDataRemoved: hasSensitiveData,
    sanitizationReport: hasSensitiveData ? opts.sanitizationReport : undefined,
    responseTokens: opts.responseTokens,
    durationMs: opts.durationMs,
  };

  if (opts.error) {
    logger.error('request_failed', { ...entry, error: opts.error.message });
  } else if (opts.blocked) {
    logger.warn('request_blocked', entry);
  } else if (hasSensitiveData) {
    logger.warn('request_sanitized', entry);
  } else {
    logger.info('request_ok', entry);
  }
}

export default logger;
