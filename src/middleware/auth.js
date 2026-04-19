import { getUserByKey } from "../data/store.js";

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

  const user = getUserByKey(token);

  if (!user) {
    return res.status(401).json({
      error: { message: "API key inválida.", type: "invalid_api_key" },
    });
  }

  if (!user.active) {
    return res.status(403).json({
      error: { message: "Conta desativada.", type: "account_disabled" },
    });
  }

  req.clientLabel = user.name;
  req.userModel = user.model || null;
  req.user = {
    id: user.id,
    name: user.name,
    model: user.model || null,
    allowedModels: Array.isArray(user.allowedModels) ? user.allowedModels : [],
  };
  return next();
}
