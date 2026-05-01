import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export interface ProviderModelInfo {
  id: string;
  name: string;
}

export type TestResult =
  | { success: true; response: string; latencyMs: number }
  | { success: false; error: string };

async function fetchOpenAICompatibleModels(baseURL: string, apiKey: string): Promise<ProviderModelInfo[]> {
  const url = baseURL.replace(/\/$/, '') + '/models';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const json = await res.json() as { data?: { id: string }[]; models?: { name: string }[] };

  if (Array.isArray(json.data)) {
    return json.data.map((m) => ({ id: m.id, name: m.id }));
  }
  if (Array.isArray(json.models)) {
    return (json.models as { name: string }[]).map((m) => ({ id: m.name, name: m.name }));
  }
  return [];
}

async function fetchOllamaModels(baseURL: string): Promise<ProviderModelInfo[]> {
  const base = baseURL.replace(/\/$/, '');
  try {
    return await fetchOpenAICompatibleModels(`${base}/v1`, 'ollama');
  } catch {
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const json = await res.json() as { models?: { name: string }[] };
    return (json.models ?? []).map((m) => ({ id: m.name, name: m.name }));
  }
}

// providerType is the base type (openrouter | ollama | lmstudio)
export async function listProviderModels(
  providerType: string,
  key?: string,
  url?: string,
): Promise<ProviderModelInfo[]> {
  switch (providerType) {
    case 'openrouter': {
      const apiKey = key ?? '';
      if (!apiKey) throw new Error('API key obrigatória para OpenRouter.');
      return fetchOpenAICompatibleModels('https://openrouter.ai/api/v1', apiKey);
    }
    case 'ollama': {
      const baseURL = (url ?? 'http://localhost:11434').replace(/\/$/, '');
      return fetchOllamaModels(baseURL);
    }
    case 'lmstudio': {
      const baseURL = (url ?? 'http://localhost:1234').replace(/\/$/, '');
      return fetchOpenAICompatibleModels(`${baseURL}/v1`, key ?? 'lm-studio');
    }
    default:
      throw new Error(`Provider "${providerType}" não reconhecido.`);
  }
}

export async function testProviderConnection(
  providerType: string,
  model: string,
  key?: string,
  url?: string,
): Promise<{ success: true; response: string; latencyMs: number } | { success: false; error: string }> {
  const start = Date.now();
  try {
    const llmModel = buildTempModel(providerType, model, key, url);
    const result = await Promise.race([
      generateText({ model: llmModel, prompt: 'say hi' }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: conexão demorou mais de 60s.')), 60_000)
      ),
    ]);
    return {
      success: true,
      response: result.text?.trim() ?? '(sem resposta)',
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function buildTempModel(providerType: string, model: string, key?: string, url?: string) {
  switch (providerType) {
    case 'openrouter': {
      const client = createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: key ?? '',
      });
      return client(model);
    }
    case 'ollama': {
      const baseURL = (url ?? 'http://localhost:11434').replace(/\/$/, '');
      const client = createOpenAI({ baseURL: `${baseURL}/v1`, apiKey: 'ollama' });
      return client(model);
    }
    case 'lmstudio': {
      const baseURL = (url ?? 'http://localhost:1234').replace(/\/$/, '');
      const client = createOpenAI({ baseURL: `${baseURL}/v1`, apiKey: key ?? 'lm-studio' });
      return client(model);
    }
    default:
      throw new Error(`Provider "${providerType}" não reconhecido.`);
  }
}
