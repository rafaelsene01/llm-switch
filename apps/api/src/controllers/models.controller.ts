import type { Request, Response } from 'express';
import { store } from '../services/store.service';

function modelPublicId(value: string): string {
  const idx = value.indexOf(':');
  return idx !== -1 ? value.slice(idx + 1) : value;
}

export function listModels(req: Request, res: Response): void {
  const allModels = store.getModels().filter((m) => m.active);
  const allowedModels = req.user?.allowedModels ?? [];

  const models =
    allowedModels.length > 0 ? allModels.filter((m) => allowedModels.includes(m.value)) : allModels;

  const seen = new Set<string>();
  const created = Math.floor(Date.now() / 1000);
  res.json({
    object: 'list',
    data: models
      .filter((m) => {
        const pub = modelPublicId(m.value);
        if (seen.has(pub)) return false;
        seen.add(pub);
        return true;
      })
      .map((m) => ({
        id: modelPublicId(m.value),
        object: 'model',
        created,
        owned_by: m.value.split(':')[0] ?? 'unknown',
      })),
  });
}

export function retrieveModel(req: Request, res: Response): void {
  const modelId = req.params.model_id;
  const allModels = store.getModels().filter((m) => m.active);
  const allowedModels = req.user?.allowedModels ?? [];

  const visible = allowedModels.length > 0 ? allModels.filter((m) => allowedModels.includes(m.value)) : allModels;
  const model = visible.find((m) => m.value === modelId || modelPublicId(m.value) === modelId);

  if (!model) {
    res.status(404).json({
      error: {
        message: `The model '${modelId}' does not exist`,
        type: 'invalid_request_error',
        code: 'model_not_found',
      },
    });
    return;
  }

  res.json({
    id: modelPublicId(model.value),
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: model.value.split(':')[0] ?? 'unknown',
  });
}
