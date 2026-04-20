# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install              # Install all workspace dependencies
nx run api:serve         # Start API in dev mode (port 3000, watch)
nx run web:dev           # Start Next.js admin UI (port 3001)
nx run-many --target=build   # Build all apps
nx run api:test          # Run backend unit tests
nx run api:lint          # Lint backend
```

```bash
docker compose up -d --build           # Dev: API + Web with bind mounts
docker compose logs -f api             # Stream API logs
docker compose -f docker-compose.prod.yml up -d --build  # Production build
docker compose down                    # Stop all services
```

Copy `.env.example` to `.env` before running. Key variables: `PORT`, `DEFAULT_PROVIDER` (format: `provider:model`), `ADMIN_KEY`, and provider keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.). Users and API keys are managed via the admin UI at `http://localhost:3001`.

## Architecture

This is an **Nx monorepo** with an OpenAI-compatible LLM proxy gateway (`apps/api`) and a Next.js 14 admin dashboard (`apps/web`), with shared TypeScript types in `libs/shared`.

### Workspace Structure

```
apps/api/    — Express + TypeScript backend (port 3000)
apps/web/    — Next.js 14 App Router admin UI (port 3001)
libs/shared/ — Shared TypeScript types (@llm-gateway/shared)
docker/      — Dockerfile (multi-stage) + nginx.conf
```

### Request Flow

```
Client → POST /v1/chat/completions
  → authMiddleware    (validates Bearer / X-Api-Key against data/config.json users)
  → rateLimitMiddleware (per-client quota via req.clientLabel)
  → chat controller   (sanitize → resolve provider → call AI SDK → log → respond)
```

Provider selection priority: `X-Provider` header → `body.model` → `req.userModel` → `DEFAULT_PROVIDER` env → `"openai:gpt-4o-mini"`. Provider format is always `"provider:model"` (e.g., `"anthropic:claude-3-5-sonnet-20241022"`).

### Key Modules (apps/api)

- **[apps/api/src/providers/index.ts](apps/api/src/providers/index.ts)** — Wraps `@ai-sdk/*` clients. `resolveModel("provider:model")` returns an AI SDK model object.
- **[apps/api/src/services/sanitizer.service.ts](apps/api/src/services/sanitizer.service.ts)** — `SanitizerService` class with regex-based PII detection. Returns `{ sanitized, findings, blocked, blockFindings }`.
- **[apps/api/src/services/store.service.ts](apps/api/src/services/store.service.ts)** — JSON file store (`data/config.json`) for users, blocklist, models. Accepts optional `dataFile` for test isolation.
- **[apps/api/src/services/chat.service.ts](apps/api/src/services/chat.service.ts)** — `ChatService.complete()` orchestrates sanitization, provider call and logging.
- **[apps/api/src/middleware/auth.middleware.ts](apps/api/src/middleware/auth.middleware.ts)** — Validates API key, sets `req.clientLabel`, `req.userModel`, `req.user`.
- **[apps/api/src/utils/logger.ts](apps/api/src/utils/logger.ts)** — Winston logger writing to `logs/audit.log` and `logs/errors.log`.

### Admin API

All `/admin/*` routes require `Authorization: Bearer <ADMIN_KEY>`. Full CRUD for users, blocklist rules, and models. The Next.js admin UI at `http://localhost:3001` proxies these routes.

### Sanitization Rules

20+ built-in regex rules covering Brazilian documents (CPF, CNPJ, RG), credentials (API keys, JWT, passwords), financial data (credit cards, Pix), and network addresses. Stored in `data/config.json`, editable via admin UI.

## UI Development (apps/web)

The admin UI uses **shadcn/ui** on top of Tailwind CSS. **Always use the shadcn MCP (`mcp__shadcn`) for any visual change in `apps/web`** — component lookup, installation, and usage reference must go through it before editing any UI file.
