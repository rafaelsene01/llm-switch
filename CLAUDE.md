# CLAUDE.md

Guidance for Claude Code working in this repo.

## Commands

```bash
npm install              # install workspace deps
nx run api:serve         # API dev mode (port 3000, watch)
nx run web:dev           # Next.js admin UI (port 3001)
nx run-many --target=build   # build all apps
nx run api:test          # backend unit tests
nx run api:lint          # lint backend
```

```bash
docker compose up -d --build           # dev: API + Web with bind mounts
docker compose logs -f api             # stream API logs
docker compose -f docker-compose.prod.yml up -d --build  # prod build
docker compose down                    # stop all
```

Copy `.env.example` to `.env` before running. Key vars: `PORT`, `ADMIN_KEY`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `LOG_LEVEL`. Web also needs `NEXT_PUBLIC_ADMIN_KEY` (same value as `ADMIN_KEY`). Provider API keys stored in `data/providers.db` via admin UI — not env vars (legacy `OPENAI_API_KEY` etc. in env.ts are unused).

## Architecture

**Nx monorepo**: OpenAI-compatible LLM proxy gateway (`apps/api`) + Next.js 14 admin dashboard (`apps/web`) + shared types in `libs/shared`.

### Workspace Structure

```
apps/api/    — Express + TypeScript backend (port 3000)
apps/web/    — Next.js 14 App Router admin UI (port 3001)
libs/shared/ — shared TypeScript types (@llm-switch/shared)
docker/      — Dockerfile (multi-stage) + nginx.conf
```

### Data Storage

All data stored in SQLite — no JSON config files in production.

```
data/gateway.db    — models, users (store.service.ts)
data/providers.db  — provider instances (providers-db.service.ts)
data/activity.db   — activity log (activity-log.service.ts)
logs/data/         — markdown files per request (YYYY/MM/DD-requestId.md)
logs/audit.log     — Winston JSON audit log
logs/errors.log    — Winston error log
```

On first start, auto-migrates from legacy `data/config.json` if present.

### Request Flow

```
Client → POST /v1/chat/completions
  → authMiddleware        (validates Bearer / X-Api-Key; sets req.user with allowedModels queue)
  → rateLimitMiddleware   (per-client express-rate-limit via req.clientLabel)
  → chat controller       (selectAvailableModel → resolveModel → AI SDK → log → respond)
```

Model selection: controlled entirely by user's `allowedModels` priority queue — clients cannot choose via `body.model`. `selectAvailableModel(allowedModels)` picks first model under quota. Returns 400 if queue empty, 429 if all over quota.

Provider format: `"instanceId:modelName"` where instanceId is a provider DB record (e.g. `"openrouter"`, `"ollama"`, `"lmstudio"`).

### Key Modules (apps/api)

- **[apps/api/src/providers/index.ts](apps/api/src/providers/index.ts)** — `resolveModel("instanceId:modelName")` builds AI SDK model from `providersDb`. `resolveEmbedder()` for embeddings (ollama/lmstudio only).
- **[apps/api/src/services/store.service.ts](apps/api/src/services/store.service.ts)** — SQLite store (`data/gateway.db`) for models and users. CRUD + `syncModels()`, `pruneUnconfiguredModels()`, `exportAll()`, `importAll()`.
- **[apps/api/src/services/providers-db.service.ts](apps/api/src/services/providers-db.service.ts)** — SQLite store (`data/providers.db`) for provider instances. Supported types: `openrouter`, `ollama`, `lmstudio`.
- **[apps/api/src/services/providers.service.ts](apps/api/src/services/providers.service.ts)** — `listProviderModels(providerType, key, url)` fetches model list from provider API. `testProviderConnection()` sends test prompt.
- **[apps/api/src/services/activity-log.service.ts](apps/api/src/services/activity-log.service.ts)** — SQLite (`data/activity.db`) + markdown files per request. Tracks tokens, cost, provider, user. `getModelUsage(model, since)` used by quota service.
- **[apps/api/src/services/quota.service.ts](apps/api/src/services/quota.service.ts)** — `selectAvailableModel(candidates)` returns first model under quota. Checks rate limit via `activityLog.getModelUsage()` with configurable buffer percent (default 10%).
- **[apps/api/src/services/pricing.service.ts](apps/api/src/services/pricing.service.ts)** — `buildPricingMap()` fetches LiteLLM pricing data. `getPricingForModel()` maps model value to cost per 1M tokens.
- **[apps/api/src/services/chat.service.ts](apps/api/src/services/chat.service.ts)** — `ChatService.complete()` and `ChatService.streamComplete()`. No sanitization — calls AI SDK directly, logs to activity log with token/cost data.
- **[apps/api/src/middleware/auth.middleware.ts](apps/api/src/middleware/auth.middleware.ts)** — Validates API key, sets `req.clientLabel`, `req.user` (includes `allowedModels` queue), `req.tokenPreview`.
- **[apps/api/src/utils/logger.ts](apps/api/src/utils/logger.ts)** — Winston logger → `logs/audit.log` and `logs/errors.log`.

### Admin API

All `/admin/*` require `Authorization: Bearer <ADMIN_KEY>`. Routes:

| Resource | Endpoints |
|---|---|
| Models | `GET/POST /admin/models`, `PATCH/DELETE /admin/models/:id` |
| Models sync | `POST /admin/models/sync` (from providers), `POST /admin/models/sync-prices` (from LiteLLM) |
| Users | `GET/POST /admin/users`, `PATCH/DELETE /admin/users/:id`, `GET /admin/users/generate-key` |
| Providers | `GET/POST /admin/providers`, `PATCH/DELETE /admin/providers/:id`, `DELETE /admin/providers/:id/key`, `GET /admin/providers/:id/models`, `POST /admin/providers/:id/test` |
| Activity | `GET /admin/activity` (paginated), `GET /admin/activity/:id`, `DELETE /admin/activity`, `DELETE /admin/activity/:id` |
| Analytics | `GET /admin/analytics` |
| Audit log | `GET /admin/audit-log` (reads `logs/audit.log`) |
| Export/Import | `GET/POST /admin/export`, `GET/POST /admin/import`, `GET/POST /admin/export/:module`, `GET/POST /admin/import/:module` |

### Supported Providers

| Provider | Type | Auth | Notes |
|---|---|---|---|
| `openrouter` | cloud | API key | Routes to any model via OpenRouter |
| `ollama` | local | none | Default URL `http://localhost:11434` |
| `lmstudio` | local | optional key | Default URL `http://localhost:1234` |

Multiple instances of same provider type supported (e.g. `openrouter_2`).

## UI Development (apps/web)

Admin UI uses **shadcn/ui** on Tailwind CSS. **Always use the shadcn MCP (`mcp__shadcn`) for any visual change in `apps/web`** — component lookup, installation, and usage reference must go through it before editing any UI file.

### Pages

| Route | Component | Description |
|---|---|---|
| `/` | `HomeStats` + `HomeConfigActions` | Dashboard: request stats + quick actions |
| `/users` | `UsersClient` | User CRUD + model priority queue |
| `/models` | `ModelsClient` | Model management, rate limits, price sync |
| `/providers` | `ProvidersClient` | Provider CRUD + connection test |
| `/activity` | `ActivityClient` | Activity log list + detail view |
| `/analytics` | `AnalyticsClient` | Usage charts by model and user |

### Key Components (apps/web)

- **[apps/web/src/components/users/ModelPriorityList.tsx](apps/web/src/components/users/ModelPriorityList.tsx)** — Ordered queue UI: add/remove/reorder allowed models per user. Used in `CreateUserDialog` and user edit flows.
- **[apps/web/src/components/users/UsersClient.tsx](apps/web/src/components/users/UsersClient.tsx)** — Users table with inline actions.
- **[apps/web/src/components/providers/ProvidersClient.tsx](apps/web/src/components/providers/ProvidersClient.tsx)** — Provider cards with config dialog and connection test panel.
- **[apps/web/src/components/shared/ImportExportActions.tsx](apps/web/src/components/shared/ImportExportActions.tsx)** — Reusable import/export for models and users modules.
- **[apps/web/src/components/analytics/AnalyticsClient.tsx](apps/web/src/components/analytics/AnalyticsClient.tsx)** — Charts: `GlobalModelsChart` (tokens by model) + `UserModelChart` (per user breakdown).
- **[apps/web/src/lib/api-client.ts](apps/web/src/lib/api-client.ts)** — `apiClient` singleton: typed methods for all admin API resources (models, users, providers, activity, analytics, export/import). Uses `NEXT_PUBLIC_ADMIN_KEY`.
- **[apps/web/src/hooks/](apps/web/src/hooks/)** — SWR/fetch hooks: `useModels`, `useUsers`, `useProviders`, `useActivity`, `useActivityDetail`, `useAnalytics`.
