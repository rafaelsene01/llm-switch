# Rule Action Modes — Specification

## Problem Statement

Atualmente as regras do sanitizador têm apenas dois estados: `active: true` (substitui e envia) ou `active: false` (ignora). Isso não permite estratégias diferentes de tratamento de dados sensíveis — em alguns casos faz sentido bloquear a requisição inteira, em outros substituir por alias reversível, em outros apenas remover. O campo `active` precisa evoluir para um enum de modos de ação com semânticas distintas.

## Goals

- [ ] Cada regra do blocklist tem um campo `mode` com 4 valores possíveis
- [ ] O sanitizador aplica a lógica correta para cada mode detectado
- [ ] O chat route trata corretamente `block` (resposta sintética) e `pseudonymize` (reversão pós-provider)
- [ ] A UI exibe seletor de mode com tooltip explicativo para cada opção
- [ ] Regras existentes (`active: true/false`) são migradas automaticamente sem perda de dados

## Out of Scope

| Feature | Reason |
|---|---|
| Modo `pseudonymize` em respostas de streaming | Complexidade de buffer; streaming retorna texto fragmentado, reversão confiável requer resposta completa |
| Múltiplos modes por regra | Uma regra, uma ação — composição via ordem de regras |
| Log diferenciado por mode | Pode ser adicionado no futuro; o report atual já registra findings |

---

## Modos de Ação

### `disabled` — Desativado
A regra é ignorada completamente. Nenhum processamento ocorre. Equivale ao atual `active: false`.

### `redact` — Redigir
O dado encontrado é substituído pelo `replacement` da regra e a requisição segue normalmente para o provider. Equivale ao atual `active: true`. É o modo padrão para novas regras.

### `pseudonymize` — Pseudonimizar
O dado é substituído por um alias gerado (`[ALIAS_1]`, `[ALIAS_2]`, …) antes de ser enviado ao provider. Quando a resposta do provider retorna, todos os aliases encontrados no texto são revertidos para os valores originais. O mapeamento (alias → original) vive apenas na memória da requisição.

> **Tooltip UI**: "Substitui o dado por um alias antes de enviar. A resposta do provider é desmascarada automaticamente — o cliente recebe os valores originais de volta."

### `block` — Bloquear
Se a regra detectar qualquer ocorrência, a requisição **não é enviada ao provider**. O gateway retorna uma resposta no formato padrão de chat completion, como se o provider tivesse respondido, mas com conteúdo indicando quais dados foram encontrados e que a requisição foi bloqueada por política.

> **Tooltip UI**: "Impede o envio ao provider. Retorna uma resposta sintética indicando qual dado sensível foi detectado."

---

## User Stories

### P1: Campo `mode` substituindo `active` no schema ⭐ MVP

**Acceptance Criteria**:

1. WHEN `POST /admin/blocklist` recebe `{ mode: "block" }` THEN o sistema SHALL persistir `mode: "block"` em `data/config.json`
2. WHEN `POST /admin/blocklist` recebe `mode` ausente THEN o sistema SHALL gravar `mode: "redact"` (padrão)
3. WHEN `PATCH /admin/blocklist/:id` recebe `{ mode: "disabled" }` THEN o sistema SHALL atualizar apenas esse campo
4. WHEN `GET /admin/blocklist` é chamado THEN o sistema SHALL retornar o campo `mode` de cada regra
5. WHEN uma regra existente tem `active: false` THEN o sistema SHALL tratá-la como `mode: "disabled"` (backward compat)
6. WHEN uma regra existente tem `active: true` THEN o sistema SHALL tratá-la como `mode: "redact"` (backward compat)

---

### P1: Sanitizador aplica lógica por mode ⭐ MVP

**Acceptance Criteria**:

1. WHEN regra com `mode: "disabled"` está presente THEN o sistema SHALL ignorá-la completamente
2. WHEN regra com `mode: "redact"` detecta ocorrência THEN o sistema SHALL substituir pelo `replacement` (comportamento atual)
3. WHEN regra com `mode: "block"` detecta ocorrência THEN o sistema SHALL sinalizar bloqueio com lista de findings (sem modificar o texto)
4. WHEN regra com `mode: "pseudonymize"` detecta ocorrências THEN o sistema SHALL substituir cada match único por um alias e retornar o mapa de reversão

---

### P1: Chat route trata `block` e `pseudonymize` ⭐ MVP

**Acceptance Criteria**:

1. WHEN sanitizador retorna `blocked: true` THEN o chat route SHALL retornar resposta sintética no formato OpenAI sem chamar o provider
2. WHEN a resposta sintética de bloqueio é retornada THEN ela SHALL conter no `content` quais regras dispararam e que a requisição foi bloqueada por política
3. WHEN sanitizador retorna `reverseMap` com aliases THEN o chat route SHALL aplicar reversão no `result.text` antes de responder ao cliente
4. WHEN `reverseMap` está vazio ou ausente THEN o chat route SHALL responder normalmente sem tentar reversão
5. WHEN modo `pseudonymize` é usado com streaming THEN o sistema SHALL **não** reverter aliases (streaming não suportado — comportamento documentado)

---

### P2: UI com seletor de mode e tooltips

**Acceptance Criteria**:

1. WHEN o formulário de criação/edição de regra é aberto THEN o sistema SHALL exibir seletor com as 4 opções de mode
2. WHEN o mouse passa sobre cada opção THEN o sistema SHALL exibir tooltip com descrição do comportamento
3. WHEN uma regra é listada THEN o sistema SHALL exibir badge colorido indicando o mode atual
4. WHEN nenhum mode é selecionado no formulário THEN o sistema SHALL enviar `mode: "redact"` (padrão)

---

## Edge Cases

- WHEN múltiplas regras com `mode: "block"` são avaliadas THEN qualquer match em qualquer regra block resulta em bloqueio
- WHEN uma regra `block` e uma regra `redact` ambas detectam dados THEN `block` tem prioridade (requisição não é enviada)
- WHEN `mode: "pseudonymize"` detecta o mesmo valor em múltiplas posições THEN SHALL usar o mesmo alias para todas as ocorrências do mesmo valor original
- WHEN a resposta do provider não contém nenhum alias do `reverseMap` THEN a resposta é retornada sem modificação
- WHEN uma regra tem `mode: "pseudonymize"` e `replacement` definido THEN `replacement` é ignorado (o alias é gerado dinamicamente)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| RAM-01 | P1: Campo `mode` no schema + backward compat | Tasks | Pending |
| RAM-02 | P1: `sanitizeMessages` retorna `blocked` + `reverseMap` | Tasks | Pending |
| RAM-03 | P1: Chat route — resposta sintética para `block` | Tasks | Pending |
| RAM-04 | P1: Chat route — reversão de aliases no texto da resposta | Tasks | Pending |
| RAM-05 | P2: UI seletor de mode com tooltips e badges | Tasks | Pending |

**Coverage**: 5 total, 0 mapeados, 5 não mapeados ⚠️

---

## Success Criteria

- [ ] Regra com `mode: "block"` impede chamada ao provider e retorna resposta sintética
- [ ] Regra com `mode: "pseudonymize"` envia aliases ao provider e o cliente recebe os valores originais de volta
- [ ] Regras existentes continuam funcionando sem alteração de dados em `config.json`
- [ ] UI exibe o mode de cada regra com visual diferenciado e tooltip
