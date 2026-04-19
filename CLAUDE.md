# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # Install dependencies
npm start          # Run production server (node src/index.js)
npm run dev        # Run with auto-reload (node --watch src/index.js)
```

```bash
docker compose up -d               # Build and start container
docker compose logs -f gateway     # Stream logs
docker compose down                # Stop container
```

There are no test or lint scripts defined.

Copy `.env.example` to `.env` before running. Key variables: `PORT`, `DEFAULT_PROVIDER` (format: `provider:model`), `ADMIN_KEY`, and provider keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.). Users and API keys are managed via the admin UI (`/admin`).

## Architecture

This is an **OpenAI-compatible LLM proxy gateway** with PII sanitization, multi-provider routing, per-client authentication, and rate limiting.

### Request Flow

```
Client → POST /v1/chat/completions
  → authMiddleware    (validates Bearer / X-Api-Key against data/config.json users)
  → rateLimitMiddleware (per-client quota via req.clientLabel)
  → chat route        (sanitize → resolve provider → call AI SDK → log → respond)
```

Provider selection priority (chat route): `X-Provider` header → `body.model` → `req.userModel` (assigned to key) → `DEFAULT_PROVIDER` env → `"openai:gpt-4o-mini"`. Provider format is always `"provider:model"` (e.g., `"anthropic:claude-3-5-sonnet-20241022"`).

### Key Modules

- **[src/providers.js](src/providers.js)** — Wraps `@ai-sdk/*` clients for OpenAI, Anthropic, Google, Mistral, OpenRouter, Ollama, and LM Studio. `resolveModel("provider:model")` returns an AI SDK model object.
- **[src/sanitizer/index.js](src/sanitizer/index.js)** — Regex-based PII detection engine. Compiles active rules from `data/config.json` and returns `{ sanitized, findings }`. Applied to all message content before any provider call.
- **[src/data/store.js](src/data/store.js)** — JSON file store (`data/config.json`) with three modules: `users`, `blocklist`, `models`. Loads defaults from `src/data/defaults/` on first run.
- **[src/middleware/auth.js](src/middleware/auth.js)** — Validates API key, sets `req.clientLabel` and optionally `req.userModel`.
- **[src/middleware/rateLimit.js](src/middleware/rateLimit.js)** — `express-rate-limit` keyed on `req.clientLabel`.
- **[src/utils/logger.js](src/utils/logger.js)** — Winston logger writing to `logs/audit.log` (all requests) and `logs/errors.log`. Each entry includes `requestId`, `client`, `provider`, `sensitiveDataRemoved`, `sanitizationReport`, `responseTokens`, `durationMs`.

### Admin API

All `/admin/*` routes require `Authorization: Bearer <ADMIN_KEY>`. Full CRUD for users, blocklist rules, and models. Export/import endpoints support per-module or full config. The admin web UI is served from `public/index.html`.

### Sanitization Rules

20+ built-in regex rules covering Brazilian documents (CPF, CNPJ, RG), credentials (API keys, JWT, passwords), financial data (credit cards, Pix), and network addresses. Rules are stored in `data/config.json` and fully editable via admin API.
