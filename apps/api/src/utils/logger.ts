import { createLogger, format, transports } from 'winston';
import path from 'path';
import { env } from '../config/env';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';

const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (otelEndpoint) {
  const loggerProvider = new LoggerProvider({
    processors: [new BatchLogRecordProcessor(new OTLPLogExporter({ url: `${otelEndpoint}/v1/logs` }))],
  });
  logs.setGlobalLoggerProvider(loggerProvider);
}

const otelLog = logs.getLogger('llm-switch-api');

const severityOf = (level: string): SeverityNumber =>
  ({ error: SeverityNumber.ERROR, warn: SeverityNumber.WARN, info: SeverityNumber.INFO, debug: SeverityNumber.DEBUG }[level] ?? SeverityNumber.INFO);

const otelEmit = format((info) => {
  if (otelEndpoint) {
    const { level, message, timestamp: _ts, [Symbol.for('level')]: _sl, [Symbol.for('splat')]: _ss, ...attrs } = info as Record<string | symbol, unknown>;
    otelLog.emit({
      severityNumber: severityOf(String(level)),
      severityText: String(level).toUpperCase(),
      body: String(message),
      attributes: attrs as Record<string, string | number | boolean>,
    });
  }
  return info;
});

const logger = createLogger({
  level: env.LOG_LEVEL,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    otelEmit(),
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
