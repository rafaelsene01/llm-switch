# LLM Gateway Corporativo

Proxy inteligente que senta entre seus sistemas internos e qualquer LLM externo (OpenAI, Anthropic, Google, etc.), **sanitizando automaticamente dados sensíveis** antes de cada requisição.

---

## Funcionalidades

| Feature | Detalhe |
|---|---|
| **Sanitização automática** | CPF, CNPJ, e-mail, telefone, cartão, API keys, senhas, JWT, CEP, IP interno, CID, CRM e mais |
| **Multi-provider** | OpenAI, Anthropic, Google Gemini, Mistral, OpenRouter, Ollama, LM Studio |
| **Compatível com OpenAI** | Seus sistemas apontam para o gateway sem mudar código |
| **Autenticação interna** | Suas próprias API keys, isoladas das chaves reais dos providers |
| **Rate limiting** | Por departamento/cliente, configurável |
| **Auditoria completa** | Todos os requests logados com: quem pediu, o que foi sanitizado, qual provider, tokens usados |
| **Blocklist customizável** | Adicione termos proprietários via `.env` |
| **Streaming** | Suporte a `stream: true` (SSE) |
| **Docker** | Sobe com um comando |

---

## Início rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar
cp .env.example .env
# Edite .env com suas chaves

# 3. Rodar
npm start
# ou em dev com auto-reload:
npm run dev
```

### Com Docker

```bash
cp .env.example .env   # configure o .env
docker compose up -d
```

---

## Uso

O gateway expõe a mesma API da OpenAI. Seus sistemas só precisam mudar a `baseURL`:

```javascript
// Antes (direto na OpenAI)
const client = new OpenAI({ apiKey: "sk-..." });

// Depois (via gateway)
const client = new OpenAI({
  baseURL: "http://localhost:3000/v1",
  apiKey: "key_dev_abc123",   // sua key interna, não a da OpenAI
});

// Funciona igual — o gateway cuida do resto
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Meu CPF é 123.456.789-00, me ajude com..." }]
  // → o CPF será removido antes de chegar na OpenAI
});
```

### Escolhendo o provider

Via `model` no body:
```json
{ "model": "anthropic:claude-3-5-haiku-20241022" }
```

---

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Health check (sem auth) |
| `POST` | `/v1/chat/completions` | Completions (compatível OpenAI) |
| `GET` | `/v1/models` | Lista providers disponíveis |
| `GET` | `/v1/models/rules` | Lista regras de sanitização |

---

## Dados sanitizados

| Tipo | Exemplo → Resultado |
|---|---|
| CPF | `123.456.789-00` → `[CPF_REMOVIDO]` |
| CNPJ | `12.345.678/0001-90` → `[CNPJ_REMOVIDO]` |
| E-mail | `joao@empresa.com` → `[EMAIL_REMOVIDO]` |
| Telefone | `(11) 91234-5678` → `[TELEFONE_REMOVIDO]` |
| Cartão | `4111 1111 1111 1111` → `[CARTAO_REMOVIDO]` |
| API Key | `sk-abc123...` → `[API_KEY_REMOVIDA]` |
| JWT | `eyJ...` → `[JWT_REMOVIDO]` |
| Senha inline | `senha: minhasenha` → `[SENHA_REMOVIDA]` |
| CEP | `01310-100` → `[CEP_REMOVIDO]` |
| IP interno | `192.168.1.10` → `[IP_INTERNO_REMOVIDO]` |

---

## Logs de auditoria

Cada requisição gera um log em `logs/audit.log`:

```json
{
  "timestamp": "2025-01-15 14:32:10",
  "level": "warn",
  "message": "request_sanitized",
  "requestId": "uuid-...",
  "client": "time-dev",
  "provider": "openai:gpt-4o",
  "sensitiveDataRemoved": true,
  "sanitizationReport": [
    { "messageIndex": 0, "role": "user", "findings": [
      { "label": "CPF", "count": 1 },
      { "label": "EMAIL", "count": 2 }
    ]}
  ],
  "responseTokens": 312,
  "durationMs": 1840
}
```

---

## Estrutura do projeto

```
llm-gateway/
├── src/
│   ├── index.js              # Entry point / servidor Express
│   ├── providers.js          # Gerenciamento de providers (AI SDK)
│   ├── middleware/
│   │   ├── auth.js           # Autenticação por API key interna
│   │   └── rateLimit.js      # Rate limiting por cliente
│   ├── routes/
│   │   ├── chat.js           # POST /v1/chat/completions
│   │   └── models.js         # GET /v1/models
│   ├── sanitizer/
│   │   └── index.js          # Motor de detecção e remoção de PII
│   └── utils/
│       └── logger.js         # Winston logger estruturado
├── logs/                     # Gerado automaticamente
├── .env.example
├── Dockerfile
└── docker-compose.yml
```
