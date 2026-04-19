import { createLogger, format, transports } from "winston";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── LOGGER PRINCIPAL ────────────────────────────────────────────────────────

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    // Console colorido para desenvolvimento
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length
            ? "\n" + JSON.stringify(meta, null, 2)
            : "";
          return `${timestamp} [${level}] ${message}${metaStr}`;
        })
      ),
    }),

    // Arquivo de auditoria (todas as requisições)
    new transports.File({
      filename: join(__dirname, "../../logs/audit.log"),
      level: "info",
    }),

    // Arquivo só de erros
    new transports.File({
      filename: join(__dirname, "../../logs/errors.log"),
      level: "error",
    }),
  ],
});

// ─── FUNÇÃO DE AUDITORIA DE REQUESTS ─────────────────────────────────────────

/**
 * Registra uma requisição completa: quem pediu, qual provider,
 * quais dados sensíveis foram removidos e o resultado.
 */
export function logRequest({
  requestId,
  clientLabel,
  providerModel,
  originalMessages,
  sanitizedMessages,
  sanitizationReport,
  responseTokens,
  durationMs,
  error,
}) {
  const hasSensitiveData = sanitizationReport.length > 0;

  const entry = {
    requestId,
    client: clientLabel,
    provider: providerModel,
    messagesCount: sanitizedMessages.length,
    sensitiveDataRemoved: hasSensitiveData,
    sanitizationReport: hasSensitiveData ? sanitizationReport : undefined,
    responseTokens,
    durationMs,
  };

  if (error) {
    logger.error("request_failed", { ...entry, error: error.message });
  } else {
    if (hasSensitiveData) {
      logger.warn("request_sanitized", entry);
    } else {
      logger.info("request_ok", entry);
    }
  }
}

export default logger;
