import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { env } from '../config/env';

const providers = {
  openai: (() => {
    const client = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    return {
      llm: (model = 'gpt-4o-mini') => client(model),
      embedder: (model = 'text-embedding-3-small') => client.embedding(model),
    };
  })(),

  anthropic: (() => {
    const client = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
    return {
      llm: (model = 'claude-3-5-haiku-20241022') => client(model),
      embedder: null as null,
    };
  })(),

  google: (() => {
    const client = createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY });
    return {
      llm: (model = 'gemini-2.0-flash') => client(model),
      embedder: (model = 'text-embedding-004') => client.textEmbeddingModel(model),
    };
  })(),

  mistral: (() => {
    const client = createMistral({ apiKey: env.MISTRAL_API_KEY });
    return {
      llm: (model = 'mistral-small-latest') => client(model),
      embedder: (model = 'mistral-embed') => client.textEmbeddingModel(model),
    };
  })(),

  openrouter: (() => {
    const client = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: env.OPENROUTER_API_KEY,
    });
    return {
      llm: (model = 'meta-llama/llama-3.1-8b-instruct:free') => client(model),
      embedder: null as null,
    };
  })(),

  ollama: (() => {
    const client = createOpenAI({
      baseURL: 'http://localhost:11434/v1',
      apiKey: 'ollama',
    });
    return {
      llm: (model = 'llama3.2') => client(model),
      embedder: (model = 'nomic-embed-text') => client.embedding(model),
    };
  })(),

  lmstudio: (() => {
    const client = createOpenAI({
      baseURL: 'http://localhost:1234/v1',
      apiKey: 'lm-studio',
    });
    return {
      llm: (model = 'local-model') => client(model),
      embedder: (model = 'nomic-embed-text') => client.embedding(model),
    };
  })(),
};

type ProviderName = keyof typeof providers;

export function resolveModel(providerModel: string) {
  const [providerName, ...modelParts] = providerModel.split(':');
  const modelName = modelParts.join(':');

  const provider = providers[providerName as ProviderName];
  if (!provider) {
    throw new Error(
      `Provider "${providerName}" não encontrado. Disponíveis: ${Object.keys(providers).join(', ')}`
    );
  }

  return provider.llm(modelName || undefined);
}

export function resolveEmbedder(providerModel: string) {
  const [providerName, ...modelParts] = providerModel.split(':');
  const modelName = modelParts.join(':');

  const provider = providers[providerName as ProviderName];
  if (!provider) {
    throw new Error(`Provider "${providerName}" não encontrado.`);
  }
  if (!provider.embedder) {
    throw new Error(`Provider "${providerName}" não suporta embeddings.`);
  }

  return provider.embedder(modelName || undefined);
}

export function listProviders() {
  return Object.entries(providers).map(([name, p]) => ({
    name,
    hasEmbedder: p.embedder !== null,
  }));
}
