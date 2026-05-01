import { createOpenAI } from '@ai-sdk/openai';
import { providersDb } from '../services/providers-db.service';

function buildLlm(instanceId: string, modelName: string) {
  const cfg = providersDb.getById(instanceId);
  if (!cfg) throw new Error(`Provider "${instanceId}" não encontrado.`);

  switch (cfg.providerType) {
    case 'openrouter': {
      const client = createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: cfg.key ?? '',
      });
      return client(modelName || 'meta-llama/llama-3.1-8b-instruct:free');
    }
    case 'ollama': {
      const client = createOpenAI({
        baseURL: `${cfg.url ?? 'http://localhost:11434'}/v1`,
        apiKey: 'ollama',
      });
      return client(modelName || 'llama3.2');
    }
    case 'lmstudio': {
      const client = createOpenAI({
        baseURL: `${cfg.url ?? 'http://localhost:1234'}/v1`,
        apiKey: cfg.key ?? 'lm-studio',
      });
      return client(modelName || 'local-model');
    }
    default:
      throw new Error(`Tipo de provider "${cfg.providerType}" não reconhecido.`);
  }
}

function buildEmbedder(instanceId: string, modelName: string) {
  const cfg = providersDb.getById(instanceId);
  if (!cfg) throw new Error(`Provider "${instanceId}" não encontrado.`);

  switch (cfg.providerType) {
    case 'ollama': {
      const client = createOpenAI({
        baseURL: `${cfg.url ?? 'http://localhost:11434'}/v1`,
        apiKey: 'ollama',
      });
      return client.embedding(modelName || 'nomic-embed-text');
    }
    case 'lmstudio': {
      const client = createOpenAI({
        baseURL: `${cfg.url ?? 'http://localhost:1234'}/v1`,
        apiKey: cfg.key ?? 'lm-studio',
      });
      return client.embedding(modelName || 'nomic-embed-text');
    }
    default:
      return null;
  }
}

export function resolveModel(providerModel: string) {
  const colonIdx = providerModel.indexOf(':');
  if (colonIdx === -1) throw new Error(`Formato inválido: "${providerModel}". Use "providerId:model".`);
  const instanceId = providerModel.slice(0, colonIdx);
  const modelName = providerModel.slice(colonIdx + 1);
  return buildLlm(instanceId, modelName);
}

export function resolveEmbedder(providerModel: string) {
  const colonIdx = providerModel.indexOf(':');
  if (colonIdx === -1) throw new Error(`Formato inválido: "${providerModel}". Use "providerId:model".`);
  const instanceId = providerModel.slice(0, colonIdx);
  const modelName = providerModel.slice(colonIdx + 1);

  const embedder = buildEmbedder(instanceId, modelName);
  if (!embedder) {
    const cfg = providersDb.getById(instanceId);
    throw new Error(`Provider "${cfg?.providerType ?? instanceId}" não suporta embeddings.`);
  }
  return embedder;
}

export function listProviders() {
  return providersDb.list().map((p) => ({
    id: p.id,
    name: p.name,
    providerType: p.providerType,
    hasEmbedder: ['ollama', 'lmstudio'].includes(p.providerType),
  }));
}
