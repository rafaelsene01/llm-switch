import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";

// ─── PROVIDERS DE LLM ────────────────────────────────────────────────────────

/**
 * Cada provider expõe: { llm(modelName), embedder(modelName) }
 *
 * Uso:
 *   const { llm } = providers.openai;
 *   const model   = llm("gpt-4o");
 */
export const providers = {

  // ── OpenAI (cloud) ──────────────────────────────────────────────────────
  openai: (() => {
    const client = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return {
      llm: (model = "gpt-4o-mini") => client(model),
      embedder: (model = "text-embedding-3-small") => client.embedding(model),
    };
  })(),

  // ── Anthropic (cloud) ───────────────────────────────────────────────────
  anthropic: (() => {
    const client = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return {
      llm: (model = "claude-3-5-haiku-20241022") => client(model),
      embedder: null,
    };
  })(),

  // ── Google Gemini (cloud) ───────────────────────────────────────────────
  google: (() => {
    const client = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY });
    return {
      llm: (model = "gemini-2.0-flash") => client(model),
      embedder: (model = "text-embedding-004") => client.textEmbeddingModel(model),
    };
  })(),

  // ── Mistral (cloud) ─────────────────────────────────────────────────────
  mistral: (() => {
    const client = createMistral({ apiKey: process.env.MISTRAL_API_KEY });
    return {
      llm: (model = "mistral-small-latest") => client(model),
      embedder: (model = "mistral-embed") => client.textEmbeddingModel(model),
    };
  })(),

  // ── OpenRouter (cloud — acessa Claude, GPT, Llama, Gemini, etc.) ────────
  openrouter: (() => {
    const client = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    return {
      llm: (model = "meta-llama/llama-3.1-8b-instruct:free") => client(model),
      embedder: null,
    };
  })(),

  // ── Ollama (local) ───────────────────────────────────────────────────────
  ollama: (() => {
    const client = createOpenAI({
      baseURL: "http://localhost:11434/v1",
      apiKey: "ollama",
    });
    return {
      llm: (model = "llama3.2") => client(model),
      embedder: (model = "nomic-embed-text") => client.embedding(model),
    };
  })(),

  // ── LM Studio (local) ────────────────────────────────────────────────────
  lmstudio: (() => {
    const client = createOpenAI({
      baseURL: "http://localhost:1234/v1",
      apiKey: "lm-studio",
    });
    return {
      llm: (model = "local-model") => client(model),
      embedder: (model = "nomic-embed-text") => client.embedding(model),
    };
  })(),
};

// ─── HELPER: SELECIONA PROVIDER + MODELO VIA STRING ─────────────────────────
/**
 * Resolve um provider e modelo a partir de uma string no formato "provider:model".
 * Exemplos:
 *   resolveModel("openai:gpt-4o")
 *   resolveModel("anthropic:claude-3-5-sonnet-20241022")
 */
export function resolveModel(providerModel) {
  const [providerName, ...modelParts] = providerModel.split(":");
  const modelName = modelParts.join(":");

  const provider = providers[providerName];
  if (!provider) {
    throw new Error(
      `Provider "${providerName}" não encontrado. Disponíveis: ${Object.keys(providers).join(", ")}`
    );
  }

  return provider.llm(modelName || undefined);
}

/**
 * Resolve um embedder a partir de uma string "provider:model".
 */
export function resolveEmbedder(providerModel) {
  const [providerName, ...modelParts] = providerModel.split(":");
  const modelName = modelParts.join(":");

  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Provider "${providerName}" não encontrado.`);
  }
  if (!provider.embedder) {
    throw new Error(`Provider "${providerName}" não suporta embeddings.`);
  }

  return provider.embedder(modelName || undefined);
}

/**
 * Lista todos os providers disponíveis e seus modelos padrão.
 */
export function listProviders() {
  return Object.entries(providers).map(([name, p]) => ({
    name,
    hasEmbedder: p.embedder !== null,
  }));
}
