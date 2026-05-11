import type { GatewayModel } from '../types';
import type { GatewayProvider } from '../types';

/** Returns [instanceId, modelName] from "instanceId:modelName" */
function splitModelValue(value: string): [string, string] {
  const idx = value.indexOf(':');
  return idx >= 0 ? [value.slice(0, idx), value.slice(idx + 1)] : ['', value];
}

/**
 * Expands the candidate list with sibling provider instances inserted after each original.
 * Siblings: same providerType + same modelName + active=true + not already in candidateSet.
 *
 * Example: ["openrouter:claude-3", "gpt-4"]
 *       → ["openrouter:claude-3", "openrouter_2:claude-3", "gpt-4"]
 */
export function buildFallbackQueue(
  candidates: string[],
  allModels: GatewayModel[],
  providers: GatewayProvider[]
): string[] {
  const candidateSet = new Set(candidates);
  const instanceTypeMap = new Map(providers.map((p) => [p.id, p.providerType]));

  const queue: string[] = [];

  for (const candidate of candidates) {
    queue.push(candidate);

    const [instanceId, modelName] = splitModelValue(candidate);
    const providerType = instanceTypeMap.get(instanceId);

    for (const model of allModels) {
      if (candidateSet.has(model.value)) continue;
      if (!model.active) continue;
      const [otherId, otherName] = splitModelValue(model.value);
      if (otherName !== modelName) continue;
      if (providerType !== undefined && instanceTypeMap.get(otherId) !== providerType) continue;
      // Insert sibling — also add to set so it won't be duplicated
      if (!queue.includes(model.value)) {
        queue.push(model.value);
        candidateSet.add(model.value);
      }
    }
  }

  return queue;
}

/**
 * Consumes the first item from an AsyncIterable without losing it.
 * Throws if the stream throws on the first item (catchable before headers are sent).
 */
export async function peekFirstChunk(
  stream: AsyncIterable<string>
): Promise<{ first: string; rest: AsyncGenerator<string> }> {
  const iter = stream[Symbol.asyncIterator]();
  const firstResult = await iter.next();

  const first = firstResult.done ? '' : firstResult.value;

  async function* rest(): AsyncGenerator<string> {
    if (firstResult.done) return;
    let result = await iter.next();
    while (!result.done) {
      yield result.value;
      result = await iter.next();
    }
  }

  return { first, rest: rest() };
}
