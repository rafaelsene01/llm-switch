import { getUserByKey } from "../data/store.js";

// ─── AUTENTICAÇÃO INTERNA ────────────────────────────────────────────────────
// Valida a key via store de usuários (data/config.json).
// Fallback: GATEWAY_KEYS no .env para compatibilidade com a config antiga.

function getLegacyKeys() {
  const raw = process.env.GATEWAY_KEYS || "";
  return raw.split(",").map((k) => k.trim()).filter(Boolean);
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const xApiKey = req.headers["x-api-key"] || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : xApiKey.trim();

  if (!token) {
    return res.status(401).json({
      error: { message: "API key ausente.", type: "missing_api_key" },
    });
  }

  // 1. Busca no store de usuários
  const user = getUserByKey(token);
  if (user && user.active) {
    req.clientLabel = user.name;
    req.userModel = user.model || null; // modelo atribuído (pode ser null)
    return next();
  }

  // 2. Fallback: GATEWAY_KEYS legado (sem modelo atribuído)
  const legacyKeys = getLegacyKeys();
  if (legacyKeys.includes(token)) {
    req.clientLabel = token.slice(0, 8) + "...";
    req.userModel = null;
    return next();
  }

  return res.status(401).json({
    error: { message: "API key inválida.", type: "invalid_api_key" },
  });
}
