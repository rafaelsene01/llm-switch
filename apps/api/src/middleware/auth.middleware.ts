import type { Request, Response, NextFunction } from 'express';
import { store } from '../services/store.service';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'] ?? '';
  const xApiKey = req.headers['x-api-key'] ?? '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (xApiKey as string).trim();

  if (!token) {
    res.status(401).json({
      error: { message: 'API key ausente.', type: 'missing_api_key' },
    });
    return;
  }

  const user = store.getUserByKey(token);

  if (!user) {
    res.status(401).json({
      error: { message: 'API key inválida.', type: 'invalid_api_key' },
    });
    return;
  }

  if (!user.active) {
    res.status(403).json({
      error: { message: 'Conta desativada.', type: 'account_disabled' },
    });
    return;
  }

  req.clientLabel = user.name;
  req.userModel = user.model ?? null;
  req.user = {
    id: user.id,
    name: user.name,
    model: user.model ?? null,
    allowedModels: Array.isArray(user.allowedModels) ? user.allowedModels : [],
  };

  next();
}
