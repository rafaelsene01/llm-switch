import rateLimit from "express-rate-limit";

// ─── CONFIGURAÇÃO DE LIMITES ──────────────────────────────────────────────────
//
// Env vars:
//   RATE_LIMIT_WINDOW_MS  = janela em ms (default: 60000 = 1 minuto)
//   RATE_LIMIT_MAX        = máximo de requisições por janela (default: 30)

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000");
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || "30");

export const rateLimitMiddleware = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,

  // Usa o clientLabel injetado pelo authMiddleware como chave de rate limit
  // → cada departamento/key tem sua própria cota
  keyGenerator: (req) => req.clientLabel || req.ip,

  standardHeaders: true,  // retorna RateLimit-* headers
  legacyHeaders: false,

  handler: (req, res) => {
    res.status(429).json({
      error: {
        message: `Limite de requisições atingido para "${req.clientLabel}". Tente novamente em breve.`,
        type: "rate_limit_exceeded",
        retry_after_ms: WINDOW_MS,
      },
    });
  },
});
