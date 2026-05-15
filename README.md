# LLM Switch

Gateway pessoal OpenAI-compatible para múltiplos providers de LLM. Configura uma vez, usa em qualquer client.

---

## Problema

Cada provider tem limites gratuitos. Sem switch: troca manual de chave, código acoplado a provider. LLM Switch centraliza — roteia para o provider/modelo certo conforme fila de prioridade do usuário.

---

## Funcionalidades

| Feature | Detalhe |
|---|---|
| **Multi-provider** | OpenRouter, Ollama, LM Studio. Múltiplas instâncias do mesmo tipo |
| **Compatível OpenAI** | Aponte qualquer client OpenAI sem mudar código |
| **Compatível Anthropic** | Endpoint `/v1/messages` suportado |
| **Fila de prioridade** | Por usuário — modelos ordenados, troca automática quando quota esgota |
| **Quota + rate limit** | Por modelo e por usuário, configurável |
| **Dashboard admin** | Gerenciar providers, usuários, modelos, atividade, analytics |
| **Streaming** | SSE (`stream: true`) |
| **Docker** | Sobe com um comando |

---

## Início rápido

```bash
cp .env.example .env
docker compose up -d --build
```

Dashboard em `http://localhost:3001`. Acesse para criar providers e usuários.

### Sem Docker

```bash
npm install
nx run api:serve   # API na porta 3000
nx run web:dev     # Admin UI na porta 3001
```

---

## Uso

Muda só a `baseURL`:

```javascript
const client = new OpenAI({
  baseURL: "http://localhost:3000/v1",
  apiKey: "sua_key_interna",  // criada no dashboard
});

const response = await client.chat.completions.create({
  model: "qualquer-coisa",  // ignorado — modelo vem da fila do usuário
  messages: [{ role: "user", content: "Olá!" }]
});
```

> O campo `model` do client é ignorado. O gateway usa a fila de prioridade configurada para o usuário. Se o modelo preferido atingiu quota, tenta o próximo automaticamente.

### Formato de modelo (no dashboard)

```
instanceId:nomeDoModelo

openrouter:claude-3-5-haiku-20241022
openrouter:gpt-4o-mini
ollama:llama3
lmstudio:mistral-7b
```

Múltiplas instâncias: `openrouter`, `openrouter_2`, etc.

---

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Health check (sem auth) |
| `POST` | `/v1/chat/completions` | Completions (OpenAI-compatible) |
| `POST` | `/v1/messages` | Messages (Anthropic-compatible) |
| `GET` | `/v1/models` | Lista modelos disponíveis |
| `GET/POST` | `/admin/*` | Admin API (Bearer ADMIN_KEY) |

---

## Estrutura

```
apps/api/    — Express + TypeScript (porta 3000)
apps/web/    — Next.js 14 admin dashboard (porta 3001)
libs/shared/ — tipos TypeScript compartilhados
data/        — SQLite: gateway.db, providers.db, activity.db
logs/        — audit.log, errors.log, markdown por requisição
```

---

## Vars de ambiente

| Var | Descrição |
|---|---|
| `PORT` | Porta da API (default 3000) |
| `ADMIN_KEY` | Chave admin (Bearer para rotas `/admin/*`) |
| `NEXT_PUBLIC_ADMIN_KEY` | Mesmo valor, usado pelo dashboard |
| `RATE_LIMIT_MAX` | Máx requisições por janela |
| `RATE_LIMIT_WINDOW_MS` | Janela de rate limit em ms |
| `LOG_LEVEL` | Nível de log Winston |

Chaves dos providers ficam no banco (`data/providers.db`) — configuradas via dashboard, não via env.
