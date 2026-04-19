import { Router } from "express";
import { listProviders } from "../providers.js";
import { listRules } from "../sanitizer/index.js";

const router = Router();

// ─── GET /v1/models ───────────────────────────────────────────────────────────
// Lista todos os providers configurados no gateway.
router.get("/", (req, res) => {
  const providers = listProviders();

  const data = providers.map((p) => ({
    id: p.name,
    object: "model",
    owned_by: "gateway",
    capabilities: {
      chat: true,
      embeddings: p.hasEmbedder,
    },
    // Exemplos de modelos para cada provider
    example_models: EXAMPLE_MODELS[p.name] || [],
  }));

  res.json({ object: "list", data });
});

// ─── GET /v1/gateway/rules ────────────────────────────────────────────────────
// Lista todas as regras de sanitização ativas (útil para auditoria).
router.get("/rules", (req, res) => {
  res.json({ rules: listRules() });
});

const EXAMPLE_MODELS = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
  anthropic: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
  google: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  mistral: ["mistral-large-latest", "mistral-small-latest", "codestral-latest"],
  openrouter: ["meta-llama/llama-3.1-8b-instruct:free", "google/gemma-2-9b-it:free"],
  ollama: ["llama3.2", "mistral", "codellama", "phi3"],
  lmstudio: ["local-model"],
};

export default router;
