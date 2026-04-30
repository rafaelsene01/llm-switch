import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { store } from '../services/store.service';

const PROVIDER_NAMES = ['openai', 'anthropic', 'google', 'mistral', 'openrouter', 'ollama', 'lmstudio'] as const;
type ProviderName = typeof PROVIDER_NAMES[number];

function getProviderConfig(id: string) {
  return store.getProviders().find((p) => p.id === id);
}

function buildLlm(providerName: ProviderName, modelName: string) {
  const cfg = getProviderConfig(providerName);

  switch (providerName) {
    case 'openai': {
      const client = createOpenAI({ apiKey: cfg?.key ?? '' });
      return client(modelName || 'gpt-4o-mini');
    }
    case 'anthropic': {
      const client = createAnthropic({ apiKey: cfg?.key ?? '' });
      return client(modelName || 'claude-3-5-haiku-20241022');
    }
    case 'google': {
      const client = createGoogleGenerativeAI({ apiKey: cfg?.key ?? '' });
      return client(modelName || 'gemini-2.0-flash');
    }
    case 'mistral': {
      const client = createMistral({ apiKey: cfg?.key ?? '' });
      return client(modelName || 'mistral-small-latest');
    }
    case 'openrouter': {
      const client = createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: cfg?.key ?? '',
      });
      return client(modelName || 'meta-llama/llama-3.1-8b-instruct:free');
    }
    case 'ollama': {
      const client = createOpenAI({
        baseURL: `${cfg?.url ?? 'http://localhost:11434'}/v1`,
        apiKey: 'ollama',
      });
      return client(modelName || 'llama3.2');
    }
    case 'lmstudio': {
      const client = createOpenAI({
        baseURL: `${cfg?.url ?? 'http://localhost:1234'}/v1`,
        apiKey: cfg?.key ?? 'lm-studio',
      });
      return client(modelName || 'local-model');
    }
  }
}

function buildEmbedder(providerName: ProviderName, modelName: string) {
  const cfg = getProviderConfig(providerName);

  switch (providerName) {
    case 'openai': {
      const client = createOpenAI({ apiKey: cfg?.key ?? '' });
      return client.embedding(modelName || 'text-embedding-3-small');
    }
    case 'google': {
      const client = createGoogleGenerativeAI({ apiKey: cfg?.key ?? '' });
      return client.textEmbeddingModel(modelName || 'text-embedding-004');
    }
    case 'mistral': {
      const client = createMistral({ apiKey: cfg?.key ?? '' });
      return client.textEmbeddingModel(modelName || 'mistral-embed');
    }
    case 'ollama': {
      const client = createOpenAI({
        baseURL: `${cfg?.url ?? 'http://localhost:11434'}/v1`,
        apiKey: 'ollama',
      });
      return client.embedding(modelName || 'nomic-embed-text');
    }
    case 'lmstudio': {
      const client = createOpenAI({
        baseURL: `${cfg?.url ?? 'http://localhost:1234'}/v1`,
        apiKey: cfg?.key ?? 'lm-studio',
      });
      return client.embedding(modelName || 'nomic-embed-text');
    }
    default:
      return null;
  }
}

export function resolveModel(providerModel: string) {
  const [providerName, ...modelParts] = providerModel.split(':');
  const modelName = modelParts.join(':');

  if (!(PROVIDER_NAMES as readonly string[]).includes(providerName)) {
    throw new Error(
      `Provider "${providerName}" não encontrado. Disponíveis: ${PROVIDER_NAMES.join(', ')}`
    );
  }

  return buildLlm(providerName as ProviderName, modelName);
}

export function resolveEmbedder(providerModel: string) {
  const [providerName, ...modelParts] = providerModel.split(':');
  const modelName = modelParts.join(':');

  if (!(PROVIDER_NAMES as readonly string[]).includes(providerName)) {
    throw new Error(`Provider "${providerName}" não encontrado.`);
  }

  const embedder = buildEmbedder(providerName as ProviderName, modelName);
  if (!embedder) {
    throw new Error(`Provider "${providerName}" não suporta embeddings.`);
  }

  return embedder;
}

export function listProviders() {
  return PROVIDER_NAMES.map((name) => ({
    name,
    hasEmbedder: ['openai', 'google', 'mistral', 'ollama', 'lmstudio'].includes(name),
  }));
}
