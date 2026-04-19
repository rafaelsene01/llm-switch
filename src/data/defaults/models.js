// ─── MODELOS PADRÃO ───────────────────────────────────────────────────────────
//
// Este arquivo define os modelos carregados na PRIMEIRA inicialização.
// Edite aqui para pré-configurar os modelos da sua empresa.
//
// Campos:
//   id     — identificador único
//   value  — string no formato "provider:modelo" (usado na API)
//   label  — nome amigável exibido na UI
//   active — true | false

export const DEFAULT_MODELS = [

  // ── OpenAI ────────────────────────────────────────────────────────────────
  {
    id: "default_openai_4o_mini",
    value: "openai:gpt-4o-mini",
    label: "GPT-4o Mini",
    active: true,
  },
  {
    id: "default_openai_4o",
    value: "openai:gpt-4o",
    label: "GPT-4o",
    active: true,
  },

  // ── Anthropic ─────────────────────────────────────────────────────────────
  {
    id: "default_claude_haiku",
    value: "anthropic:claude-3-5-haiku-20241022",
    label: "Claude 3.5 Haiku",
    active: true,
  },
  {
    id: "default_claude_sonnet",
    value: "anthropic:claude-3-5-sonnet-20241022",
    label: "Claude 3.5 Sonnet",
    active: true,
  },

  // ── Google ────────────────────────────────────────────────────────────────
  {
    id: "default_gemini_flash",
    value: "google:gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    active: true,
  },

  // ── Modelos locais ────────────────────────────────────────────────────────
  {
    id: "default_ollama_llama",
    value: "ollama:llama3.2",
    label: "Llama 3.2 (Ollama local)",
    active: true,
  },
  {
    id: "default_lmstudio_qwen",
    value: "lmstudio:qwen/qwen3-8b",
    label: "Qwen3 8B (LM Studio local)",
    active: true,
  },
];
