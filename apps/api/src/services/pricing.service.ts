export interface ModelPricing {
  inputCostPer1M: number;
  outputCostPer1M: number;
}

const LOCAL_PROVIDERS = new Set(['lmstudio', 'ollama']);

const LITELLM_PRICES_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

interface LiteLLMEntry {
  input_cost_per_token?: number;
  output_cost_per_token?: number;
}

function toLiteLLMKeys(modelValue: string): string[] {
  const [provider, model] = modelValue.split(/:(.+)/);
  return [
    `${provider}/${model}`,
    model,
  ];
}

async function fetchLiteLLMPricing(): Promise<Map<string, ModelPricing>> {
  const res = await fetch(LITELLM_PRICES_URL, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`LiteLLM fetch failed: HTTP ${res.status}`);

  const data = await res.json() as Record<string, LiteLLMEntry>;
  const map = new Map<string, ModelPricing>();

  for (const [key, entry] of Object.entries(data)) {
    const input = entry.input_cost_per_token;
    const output = entry.output_cost_per_token;
    if (input === undefined || output === undefined) continue;
    map.set(key, {
      inputCostPer1M: parseFloat((input * 1_000_000).toFixed(6)),
      outputCostPer1M: parseFloat((output * 1_000_000).toFixed(6)),
    });
  }

  return map;
}

function lookupInMap(modelValue: string, map: Map<string, ModelPricing>): ModelPricing | null {
  for (const key of toLiteLLMKeys(modelValue)) {
    const exact = map.get(key);
    if (exact) return exact;
    for (const [mapKey, pricing] of map) {
      if (key.startsWith(mapKey) || mapKey.startsWith(key)) return pricing;
    }
  }
  return null;
}

export function getPricingForModel(
  modelValue: string,
  litellmMap: Map<string, ModelPricing>
): ModelPricing | null {
  const provider = modelValue.split(':')[0];
  if (LOCAL_PROVIDERS.has(provider)) return { inputCostPer1M: 0, outputCostPer1M: 0 };
  return lookupInMap(modelValue, litellmMap);
}

export async function buildPricingMap(): Promise<Map<string, ModelPricing>> {
  return fetchLiteLLMPricing();
}
