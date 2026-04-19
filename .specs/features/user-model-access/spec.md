# User Model Access Control — Specification

## Problem Statement

Atualmente todos os usuários autenticados têm acesso irrestrito a todos os modelos do gateway. Não há como limitar quais modelos um usuário pode usar nem filtrar a listagem de modelos pelo token do chamador. Isso impede controle granular de acesso e custo por cliente.

## Goals

- [ ] Administrador pode definir um modelo padrão e uma lista de modelos permitidos por usuário
- [ ] `GET /v1/models` retorna apenas os modelos que o token do chamador tem acesso
- [ ] Requisições de chat que usam modelo fora da lista permitida são rejeitadas com 403

## Out of Scope

| Feature | Reason |
|---|---|
| Quotas / limite de tokens por modelo | Fora do escopo desta feature; é feature separada de billing |
| Permissões por grupo/role | Complexidade desnecessária agora; usuário individual é suficiente |
| Herança de permissões | Sem hierarquia de usuários no sistema atual |

---

## User Stories

### P1: Definir modelo padrão e lista de modelos permitidos ao criar/editar usuário ⭐ MVP

**User Story**: Como administrador, quero definir o modelo padrão e os modelos permitidos de um usuário ao criá-lo ou editá-lo, para que eu possa controlar quais IAs cada cliente pode acessar.

**Why P1**: Sem isso, as demais features não funcionam — é o dado de origem.

**Acceptance Criteria**:

1. WHEN `POST /admin/users` recebe `{ allowedModels: ["openai:gpt-4o", "anthropic:claude-3-5-haiku-20241022"] }` THEN o sistema SHALL persistir o array em `data/config.json` no objeto do usuário
2. WHEN `POST /admin/users` recebe `allowedModels` ausente ou `[]` THEN o sistema SHALL gravar `allowedModels: []` (semântica: acesso a todos os modelos)
3. WHEN `PATCH /admin/users/:id` recebe `{ allowedModels: [...] }` THEN o sistema SHALL atualizar o campo sem alterar outros campos
4. WHEN `GET /admin/users` é chamado THEN o sistema SHALL retornar o campo `allowedModels` de cada usuário
5. WHEN `POST /admin/users` recebe `{ model: "openai:gpt-4o" }` como modelo padrão THEN o sistema SHALL continuar funcionando normalmente (campo `model` já existe, não muda)

**Independent Test**: Criar usuário via `POST /admin/users` com `allowedModels`, depois `GET /admin/users` e verificar o campo retornado.

---

### P1: Filtrar listagem de modelos pelo token do usuário ⭐ MVP

**User Story**: Como usuário da API, quero que `GET /v1/models` retorne apenas os modelos que meu token permite usar, para que eu saiba exatamente quais opções tenho disponíveis.

**Why P1**: Core da feature — o token deve ser a fonte de verdade de acesso.

**Acceptance Criteria**:

1. WHEN `GET /v1/models` é chamado com token de usuário que tem `allowedModels: ["openai:gpt-4o"]` THEN o sistema SHALL retornar apenas `openai:gpt-4o` na listagem
2. WHEN `GET /v1/models` é chamado com token de usuário com `allowedModels: []` THEN o sistema SHALL retornar todos os modelos ativos de `data/config.json`
3. WHEN `GET /v1/models` é chamado com token legado (GATEWAY_KEYS) THEN o sistema SHALL retornar todos os modelos ativos (sem restrição, backward compatible)
4. WHEN o modelo em `allowedModels` do usuário não existe em `data/config.json` THEN o sistema SHALL omiti-lo silenciosamente da listagem

**Independent Test**: Criar dois usuários com `allowedModels` distintos, chamar `GET /v1/models` com cada token e comparar as respostas.

---

### P1: Bloquear uso de modelo não permitido no chat ⭐ MVP

**User Story**: Como administrador, quero que usuários com modelos restritos não consigam chamar modelos fora da lista permitida, mesmo que tentem via header `X-Provider` ou `body.model`.

**Why P1**: Sem validação no chat, o controle de acesso é apenas cosmético.

**Acceptance Criteria**:

1. WHEN `POST /v1/chat/completions` usa modelo que NÃO está em `allowedModels` do usuário THEN o sistema SHALL retornar `403 Forbidden` com mensagem explicativa
2. WHEN `POST /v1/chat/completions` usa modelo que ESTÁ em `allowedModels` THEN o sistema SHALL processar normalmente
3. WHEN usuário tem `allowedModels: []` THEN o sistema SHALL permitir qualquer modelo (sem restrição)
4. WHEN token legado (GATEWAY_KEYS) é usado THEN o sistema SHALL permitir qualquer modelo (backward compatible)
5. WHEN usuário tem modelo padrão (`model`) que NÃO está em `allowedModels` THEN o sistema SHALL retornar 403 (o padrão também é validado)

**Independent Test**: Usuário com `allowedModels: ["openai:gpt-4o-mini"]` tenta chamar `anthropic:claude-3-5-haiku-20241022` → espera 403.

---

### P2: Interface admin para gerenciar modelos permitidos

**User Story**: Como administrador, quero gerenciar `allowedModels` de um usuário pela interface web do gateway, sem precisar chamar a API manualmente.

**Why P2**: Muito útil na operação, mas a API já entrega a funcionalidade — a UI é conforto.

**Acceptance Criteria**:

1. WHEN o formulário de criação de usuário é aberto THEN o sistema SHALL exibir um seletor multi-select com os modelos disponíveis em `data/config.json`
2. WHEN o administrador seleciona modelos THEN o sistema SHALL enviar `allowedModels` no payload de criação
3. WHEN o administrador edita um usuário THEN o sistema SHALL pré-selecionar os modelos já atribuídos
4. WHEN nenhum modelo é selecionado THEN o sistema SHALL enviar `allowedModels: []` (acesso total)

**Independent Test**: Criar usuário pela UI com 2 modelos selecionados, verificar no `GET /admin/users` que `allowedModels` tem os 2 valores.

---

## Edge Cases

- WHEN `allowedModels` contém valor inválido (não é `"provider:model"`) THEN sistema SHALL aceitar mas o modelo será omitido na listagem (não valida formato na escrita)
- WHEN todos os modelos do usuário são removidos do gateway THEN `GET /v1/models` SHALL retornar lista vazia, e chat SHALL retornar 403 em qualquer chamada
- WHEN o usuário tem modelo padrão (`model`) que não está em `allowedModels` THEN sistema SHALL retornar 403 na primeira requisição de chat (o padrão também é validado)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| UMA-01 | P1: Persistir allowedModels no store | Tasks | Pending |
| UMA-02 | P1: Retornar allowedModels no GET /admin/users | Tasks | Pending |
| UMA-03 | P1: Expor allowedModels no auth middleware (req.user) | Tasks | Pending |
| UMA-04 | P1: GET /v1/models filtrado por token | Tasks | Pending |
| UMA-05 | P1: Bloquear modelo não permitido no chat (403) | Tasks | Pending |
| UMA-06 | P1: Backward compat com allowedModels: [] e tokens legados | Tasks | Pending |
| UMA-07 | P2: UI multi-select de modelos no formulário de usuário | Tasks | Pending |

**Coverage**: 7 total, 0 mapeados, 7 não mapeados ⚠️

---

## Success Criteria

- [ ] Token com `allowedModels` definido não consegue chamar modelo fora da lista (validado via API)
- [ ] `GET /v1/models` retorna conjunto diferente para tokens com restrições diferentes
- [ ] Usuários com `allowedModels: []` (legado) continuam funcionando sem alteração
