import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error('unhandled_error', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    error: {
      message: err.message || 'Erro interno do servidor.',
      type: 'internal_error',
    },
  });
}
