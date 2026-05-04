import type { GatewayModel, ModelRateLimit } from '../types';
import { activityLog } from './activity-log.service';
import { store } from './store.service';

const DEFAULT_BUFFER_PERCENT = 10;

function getWindowStart(rl: ModelRateLimit): string {
  let msBack: number;
  if (rl.interval === 'hourly') {
    msBack = (rl.intervalHours ?? 1) * 60 * 60 * 1000;
  } else if (rl.interval === 'daily') {
    msBack = 24 * 60 * 60 * 1000;
  } else {
    msBack = 7 * 24 * 60 * 60 * 1000;
  }
  return new Date(Date.now() - msBack).toISOString();
}

function isModelUnderQuota(model: GatewayModel): boolean {
  const rl = model.rateLimit;
  if (!rl) return true;

  const bufferPercent = rl.bufferPercent ?? DEFAULT_BUFFER_PERCENT;
  const threshold = rl.amount * (1 - bufferPercent / 100);
  const since = getWindowStart(rl);
  const usage = activityLog.getModelUsage(model.value, since);
  const current = rl.unit === 'tokens' ? usage.tokens : usage.requests;
  return current < threshold;
}

/**
 * Selects the first available model from the candidate list.
 * Returns null if every candidate is over quota.
 */
export function selectAvailableModel(candidates: string[]): string | null {
  const allModels = store.getModels();
  const modelMap = new Map(allModels.map((m) => [m.value, m]));

  for (const modelValue of candidates) {
    const model = modelMap.get(modelValue);
    // If model is not in the store (provider not configured in DB), treat as available —
    // resolveModel() will handle provider resolution and may still succeed.
    if (!model) return modelValue;
    if (!model.active) continue;
    if (isModelUnderQuota(model)) return modelValue;
  }

  return null;
}
