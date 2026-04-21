import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';

export interface ProviderModelInfo {
  id: string;
  name: string;
}

export type TestResult =
  | { success: true; response: string; latencyMs: number }
  | { success: false; error: string };

// Hardcoded model lists for providers without a list-models endpoint
const STATIC_MODELS: Record<string, ProviderModelInfo[]> = {
  anthropic: [
    { id: 'claude-opus-4-5', name: 'Claude Opus 4.5' },
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
  ],
  google: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B' },
  ],
};

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
  // Ollama /api/tags format
  if (Array.isArray(json.models)) {
    return (json.models as { name: string }[]).map((m) => ({ id: m.name, name: m.name }));
  }
  return [];
}

async function fetchOllamaModels(baseURL: string): Promise<ProviderModelInfo[]> {
  const base = baseURL.replace(/\/$/, '');
  try {
    // Try OpenAI-compatible /v1/models first
    return await fetchOpenAICompatibleModels(`${base}/v1`, 'ollama');
  } catch {
    // Fall back to native Ollama /api/tags
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const json = await res.json() as { models?: { name: string }[] };
    return (json.models ?? []).map((m) => ({ id: m.name, name: m.name }));
  }
}

export async function listProviderModels(
  providerId: string,
  key?: string,
  url?: string,
): Promise<ProviderModelInfo[]> {
  switch (providerId) {
    case 'openai': {
      const apiKey = key ?? '';
      if (!apiKey) throw new Error('API key obrigatória para OpenAI.');
      return fetchOpenAICompatibleModels('https://api.openai.com/v1', apiKey);
    }
    case 'mistral': {
      const apiKey = key ?? '';
      if (!apiKey) throw new Error('API key obrigatória para Mistral.');
      return fetchOpenAICompatibleModels('https://api.mistral.ai/v1', apiKey);
    }
    case 'openrouter': {
      const apiKey = key ?? '';
      if (!apiKey) throw new Error('API key obrigatória para OpenRouter.');
      return fetchOpenAICompatibleModels('https://openrouter.ai/api/v1', apiKey);
    }
    case 'anthropic':
    case 'google':
      return STATIC_MODELS[providerId];
    case 'ollama': {
      const baseURL = (url ?? 'http://localhost:11434').replace(/\/$/, '');
      return fetchOllamaModels(baseURL);
    }
    case 'lmstudio': {
      const baseURL = (url ?? 'http://localhost:1234').replace(/\/$/, '');
      return fetchOpenAICompatibleModels(`${baseURL}/v1`, key ?? 'lm-studio');
    }
    default:
      throw new Error(`Provider "${providerId}" não reconhecido.`);
  }
}

export async function testProviderConnection(
  providerId: string,
  model: string,
  key?: string,
  url?: string,
): Promise<{ success: true; response: string; latencyMs: number } | { success: false; error: string }> {
  const start = Date.now();
  try {
    const llmModel = buildTempModel(providerId, model, key, url);
    const result = await Promise.race([
      generateText({ model: llmModel, prompt: "hi" }),
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

function buildTempModel(providerId: string, model: string, key?: string, url?: string) {
  switch (providerId) {
    case 'openai': {
      const client = createOpenAI({ apiKey: key ?? '' });
      return client(model);
    }
    case 'anthropic': {
      const client = createAnthropic({ apiKey: key ?? '' });
      return client(model);
    }
    case 'google': {
      const client = createGoogleGenerativeAI({ apiKey: key ?? '' });
      return client(model);
    }
    case 'mistral': {
      const client = createMistral({ apiKey: key ?? '' });
      return client(model);
    }
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
      throw new Error(`Provider "${providerId}" não reconhecido.`);
  }
}
