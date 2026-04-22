import type { Request, Response } from 'express';
import { store } from '../services/store.service';
import { sanitizer } from '../services/sanitizer.service';

export function listModels(req: Request, res: Response): void {
  const allModels = store.getModels().filter((m) => m.active);
  const allowedModels = req.user?.allowedModels ?? [];

  const models =
    allowedModels.length > 0 ? allModels.filter((m) => allowedModels.includes(m.value)) : allModels;

  res.json({
    object: 'list',
    data: models.map((m) => ({
      id: m.value,
      object: 'model',
      created: 0,
      owned_by: m.value.split(':')[0] ?? 'unknown',
    })),
  });
}

export function listRules(_req: Request, res: Response): void {
  res.json(sanitizer.listRules());
}
