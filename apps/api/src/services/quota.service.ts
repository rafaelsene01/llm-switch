import type { GatewayModel, ModelRateLimit } from '../types';
import { activityLog } from './activity-log.service';
import { providersDb } from './providers-db.service';
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

/** Returns [instanceId, modelName] from a model value like "openrouter:anthropic/claude-3-sonnet" */
function splitModelValue(modelValue: string): [string, string] {
  const idx = modelValue.indexOf(':');
  return idx >= 0
    ? [modelValue.slice(0, idx), modelValue.slice(idx + 1)]
    : ['', modelValue];
}

/**
 * Selects the first available model from the candidate list.
 * When a candidate is over quota, tries sibling provider instances of the same
 * provider TYPE (e.g., openrouter + openrouter_2) with the same model name,
 * before moving on to the next model in the queue.
 * Returns null if every candidate and its siblings are over quota.
 */
export function selectAvailableModel(candidates: string[]): string | null {
  const allModels = store.getModels();
  const modelMap = new Map(allModels.map((m) => [m.value, m]));
  const candidateSet = new Set(candidates);

  // Build instanceId → providerType map for sibling matching
  const instanceTypeMap = new Map(
    providersDb.list().map((p) => [p.id, p.providerType])
  );

  for (const modelValue of candidates) {
    const model = modelMap.get(modelValue);
    // If model is not in the store (provider not configured in DB), treat as available —
    // resolveModel() will handle provider resolution and may still succeed.
    if (!model) return modelValue;
    if (!model.active) continue;
    if (isModelUnderQuota(model)) return modelValue;

    // Model is over quota — try sibling provider instances:
    // same provider TYPE (e.g., both openrouter) + same model name, not already in the queue.
    const [instanceId, modelName] = splitModelValue(modelValue);
    const providerType = instanceTypeMap.get(instanceId);

    for (const [otherValue, otherModel] of modelMap) {
      if (otherValue === modelValue) continue;
      if (candidateSet.has(otherValue)) continue;
      if (!otherModel.active) continue;
      const [otherId, otherName] = splitModelValue(otherValue);
      if (otherName !== modelName) continue;
      if (providerType !== undefined && instanceTypeMap.get(otherId) !== providerType) continue;
      if (isModelUnderQuota(otherModel)) return otherValue;
    }
  }

  return null;
}
