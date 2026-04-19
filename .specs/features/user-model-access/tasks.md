# User Model Access Control — Tasks

**Spec**: `.specs/features/user-model-access/spec.md`
**Status**: Done

---

## Execution Plan

### Phase 1: Foundation (Sequential)

```
T1 → T2
```

### Phase 2: Core Implementation (Parallel)

Após T2 concluído, T3, T4 e T5 podem rodar em paralelo.

```
     ┌→ T3 ─┐
T2 ──┼→ T4 ─┼──→ T6
     └→ T5 ─┘
```

### Phase 3: Integration (Sequential)

```
T5 → T6
```

---

## Task Breakdown

### T1: Adicionar `allowedModels` ao schema de usuário no store

**What**: Atualizar `addUser` e `updateUser` em `store.js` para persistir o campo `allowedModels` (array de strings). Campo ausente é normalizado para `[]`.
**Where**: `src/data/store.js`
**Depends on**: None
**Requirement**: UMA-01

**Done when**:
- [ ] `addUser({ name, key, model, allowedModels })` persiste `allowedModels` em `data/config.json`
- [ ] `allowedModels` ausente no payload vira `[]` no objeto salvo
- [ ] `updateUser(id, { allowedModels: [...] })` atualiza apenas esse campo
- [ ] `getUsers()` retorna `allowedModels` em cada usuário (não é campo mascarado)
- [ ] Usuários existentes sem `allowedModels` continuam funcionando (leitura retorna `[]` por ausência do campo)

**Tests**: none
**Gate**: manual — `node -e "import('./src/data/store.js').then(m => console.log(m.addUser({name:'t',key:'k'}).allowedModels))"`

---

### T2: Expor `req.user` com `allowedModels` no auth middleware

**What**: Adicionar `req.user` ao `authMiddleware` contendo `{ id, name, model, allowedModels }`. Tokens legados recebem `req.user = null` (comportamento sem restrição).
**Where**: `src/middleware/auth.js`
**Depends on**: T1
**Requirement**: UMA-03, UMA-06

**Done when**:
- [ ] Para token do store: `req.user` tem `{ id, name, model, allowedModels }`
- [ ] Para token legado (GATEWAY_KEYS): `req.user = null`
- [ ] `req.userModel` continua sendo definido (sem quebrar chat.js)
- [ ] `req.clientLabel` continua sendo definido (sem quebrar rate limit e logs)

**Tests**: none
**Gate**: manual — iniciar servidor, fazer requisição com token válido, adicionar `console.log(req.user)` temporário em chat.js para verificar

---

### T3: Refatorar `GET /v1/models` para usar config.json filtrado por usuário [P]

**What**: Substituir a lista estática de providers por modelos de `data/config.json`. Filtrar pelo `allowedModels` do usuário autenticado quando definido.
**Where**: `src/routes/models.js`
**Depends on**: T2
**Reuses**: `getModels()` de `src/data/store.js`
**Requirement**: UMA-04, UMA-06

**Done when**:
- [ ] `GET /v1/models` retorna modelos de `data/config.json` (campo `active: true`)
- [ ] Usuário com `allowedModels: ["openai:gpt-4o"]` recebe apenas esse modelo
- [ ] Usuário com `allowedModels: []` recebe todos os modelos ativos
- [ ] Token legado (`req.user = null`) recebe todos os modelos ativos
- [ ] Resposta mantém formato `{ object: "list", data: [{ id, object, owned_by, ... }] }`
- [ ] Campo `example_models` e `capabilities` são removidos (não mais relevantes com lista real)

**Tests**: none
**Gate**: manual — `curl -H "Authorization: Bearer <token>" http://localhost:3000/v1/models`

---

### T4: Validar acesso ao modelo no chat route [P]

**What**: Antes de chamar o provider em `chat.js`, verificar se o `providerModel` resolvido está em `req.user.allowedModels`. Rejeitar com 403 se não estiver.
**Where**: `src/routes/chat.js`
**Depends on**: T2
**Requirement**: UMA-05, UMA-06

**Done when**:
- [ ] Se `req.user?.allowedModels?.length > 0` e `providerModel` não está na lista → retorna `403` com `{ error: { message: "Modelo '...' não permitido para este token.", type: "model_not_allowed" } }`
- [ ] Se `req.user?.allowedModels` é `[]` → segue normalmente (sem restrição)
- [ ] Se `req.user` é `null` (token legado) → segue normalmente
- [ ] Validação ocorre APÓS resolver o `providerModel` (linha 26 do chat.js) e ANTES de chamar o provider
- [ ] Logs incluem o erro de acesso quando 403 é retornado

**Tests**: none
**Gate**: manual — token com `allowedModels: ["openai:gpt-4o-mini"]` tenta `anthropic:claude-3-5-haiku-20241022` → espera `{ error: { type: "model_not_allowed" } }`

---

### T5: Atualizar admin routes para aceitar `allowedModels` no CRUD de usuários [P]

**What**: Garantir que `POST /admin/users` e `PATCH /admin/users/:id` passem `allowedModels` para o store. Sem nova validação de formato — aceita qualquer array de strings.
**Where**: `src/routes/admin.js`
**Depends on**: T1
**Requirement**: UMA-01, UMA-02

**Done when**:
- [ ] `POST /admin/users` extrai `allowedModels` do body e passa para `addUser()`
- [ ] `PATCH /admin/users/:id` não precisa de alteração (o `updateUser` já faz spread do patch, incluindo `allowedModels`)
- [ ] `GET /admin/users` retorna `allowedModels` (já retorna automaticamente após T1)

**Tests**: none
**Gate**: manual — `curl -X POST /admin/users -d '{"name":"t","key":"gw_test","allowedModels":["openai:gpt-4o"]}' | jq .allowedModels`

---

### T6: Atualizar admin UI para gerenciar `allowedModels` do usuário

**What**: Adicionar campo multi-select no formulário de criar/editar usuário na UI admin (`public/index.html`). Opções carregadas de `GET /admin/models`.
**Where**: `public/index.html`
**Depends on**: T5, T3
**Requirement**: UMA-07

**Done when**:
- [ ] Formulário de criação de usuário exibe lista de checkboxes ou select múltiplo com modelos disponíveis
- [ ] Submit envia `allowedModels: []` quando nenhum selecionado, ou array com os valores selecionados
- [ ] Ao editar usuário (PATCH), os modelos já atribuídos aparecem pré-selecionados
- [ ] Label indica claramente que deixar vazio = acesso a todos os modelos
- [ ] A listagem de usuários na tabela exibe `allowedModels` de forma legível (ex: "3 modelos" ou lista)

**Tests**: none
**Gate**: manual — abrir `http://localhost:3000`, criar usuário com 2 modelos selecionados, verificar na listagem

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 ──→ T2

Phase 2 (Parallel — todos dependem de T1/T2):
  T2 complete, then:
    ├── T3 [P]  (models route)
    ├── T4 [P]  (chat validation)
    └── T5 [P]  (admin routes)

Phase 3 (Sequential):
  T5 complete, then:
    T6  (UI depende da API de admin estar pronta)
```

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | Início da fase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 [P] | ✅ Match |
| T4 | T2 | T2 → T4 [P] | ✅ Match |
| T5 | T1 | T2 → T5 [P] (via T1) | ✅ Match |
| T6 | T5, T3 | T5 → T6 | ✅ Match |

---

## Requirement Traceability

| Requirement ID | Task(s) | Status |
|---|---|---|
| UMA-01 | T1, T5 | Pending |
| UMA-02 | T1, T5 | Pending |
| UMA-03 | T2 | Pending |
| UMA-04 | T3 | Pending |
| UMA-05 | T4 | Pending |
| UMA-06 | T2, T3, T4 | Pending |
| UMA-07 | T6 | Pending |

**Coverage**: 7 total, 7 mapeados, 0 não mapeados ✅
