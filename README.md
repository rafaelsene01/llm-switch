# LLM Switch

Um gateway de uso pessoal para cadastrar e alternar entre múltiplos providers de LLM — OpenAI, Anthropic, Google, Mistral e outros — aproveitando ao máximo os limites gratuitos de cada um sem precisar trocar de API key ou mudar código.

---

## O problema que resolve

Cada provider oferece um nível gratuito com limites de tokens/requisições. Sem um switch, você precisa ficar trocando de chave manualmente ou fica preso em um único provider. O LLM Switch centraliza tudo: você configura suas chaves uma vez e usa normalmente, enquanto o switch roteia para o provider que você quiser.

---

## Funcionalidades

| Feature | Detalhe |
|---|---|
| **Multi-provider** | OpenAI, Anthropic, Google Gemini, Mistral, OpenRouter, Ollama, LM Studio |
| **Compatível com OpenAI** | Aponte qualquer client OpenAI para o LLM Switch sem mudar código |
| **Dashboard admin** | Interface web para gerenciar providers, usuários, modelos e regras |
| **Sanitização de PII** | Remove CPF, CNPJ, e-mail, API keys, senhas e mais antes de enviar ao provider |
| **Autenticação própria** | Suas chaves internas, isoladas das chaves reais dos providers |
| **Rate limiting** | Por usuário/cliente, configurável |
| **Streaming** | Suporte a `stream: true` (SSE) |
| **Docker** | Sobe com um comando |

---

## Início rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar
cp .env.example .env
# Edite .env com suas chaves de cada provider

# 3. Rodar
npm run dev
```

### Com Docker

```bash
cp .env.example .env
docker compose up -d
```

Acesse o dashboard em `http://localhost:3001` para configurar providers e criar usuários.

---

## Uso

O LLM Switch expõe a mesma API da OpenAI. Qualquer client só precisa mudar a `baseURL`:

```javascript
const client = new OpenAI({
  baseURL: "http://localhost:3000/v1",
  apiKey: "sua_key_interna",  // criada no dashboard, não a chave real do provider
});

// Escolha o provider no campo model
const response = await client.chat.completions.create({
  model: "anthropic:claude-3-5-haiku-20241022",  // ou "openai:gpt-4o-mini", "google:gemini-2.0-flash" etc.
  messages: [{ role: "user", content: "Olá!" }]
});
```

### Formato do model

Sempre `provider:modelo`:

```
openai:gpt-4o-mini
anthropic:claude-3-5-haiku-20241022
google:gemini-2.0-flash
mistral:mistral-small-latest
```

---

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Health check (sem auth) |
| `POST` | `/v1/chat/completions` | Completions (compatível OpenAI) |
| `GET` | `/v1/models` | Lista modelos disponíveis |

---

## Estrutura do projeto

```
llm-switch/
├── apps/
│   ├── api/    — Express + TypeScript (porta 3000)
│   └── web/    — Next.js 14 admin dashboard (porta 3001)
├── libs/
│   └── shared/ — Tipos TypeScript compartilhados
├── docker/
├── .env.example
└── docker-compose.yml
```
