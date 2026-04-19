# Rule Action Modes — Tasks

**Spec**: `.specs/features/rule-action-modes/spec.md`
**Status**: Done
**Nota**: Streaming foi desabilitado no chat route — a feature `pseudonymize` funciona apenas em modo non-stream.

---

## Execution Plan

```
T1 ──→ T2 ──→ T3
              ├──→ T4 [P]
              └──→ T5 [P]
```

- **T1** (store): schema + backward compat — base de tudo
- **T2** (sanitizer): lógica dos 4 modes — depende do schema
- **T3** (chat route): tratamento de `block` e reversão de aliases — depende do sanitizer retornar as novas estruturas
- **T4** (admin routes): aceitar `mode` no CRUD — depende do store (T1), pode rodar após T2
- **T5** (UI): seletor + tooltips + badges — depende da API estar pronta (T4)

---

## Task Breakdown

### T1: Migrar campo `active` → `mode` no schema do store

**What**: Atualizar `addBlocklistEntry` e `updateBlocklistEntry` em `store.js` para persistir `mode`. Implementar lógica de backward compat: ao ler regras existentes com `active`, converter para `mode` sem escrever no arquivo. Atualizar `defaults/blocklist.js` para incluir `mode: "redact"` em todas as entradas.

**Where**: `src/data/store.js`, `src/data/defaults/blocklist.js`

**Depends on**: None

**Requirement**: RAM-01

**Valores válidos de `mode`**: `"disabled"` | `"redact"` | `"pseudonymize"` | `"block"`

**Done when**:
- [ ] `addBlocklistEntry({ ..., mode })` persiste `mode` em `data/config.json` (default: `"redact"`)
- [ ] `updateBlocklistEntry(id, { mode })` atualiza apenas esse campo
- [ ] `getBlocklist()` normaliza regras legadas: `active: false` → `mode: "disabled"`, `active: true` → `mode: "redact"` (sem alterar o arquivo)
- [ ] `defaults/blocklist.js` tem `mode: "redact"` em todas as regras (campo `active` mantido por compat)
- [ ] `listRules()` em `sanitizer/index.js` expõe `mode` no retorno

**Gate**: manual — `node -e "import('./src/data/store.js').then(m => console.log(JSON.stringify(m.getBlocklist()[0])))"`

---

### T2: Implementar lógica de processamento por `mode` no sanitizer

**What**: Refatorar `sanitizeText` e `sanitizeMessages` para processar regras de acordo com o `mode`. A função deve retornar estrutura enriquecida: `{ sanitized, findings, blocked, blockFindings, reverseMap }`.

**Where**: `src/sanitizer/index.js`

**Depends on**: T1

**Requirement**: RAM-02

**Contrato de retorno de `sanitizeMessages`**:
```js
{
  messages: Message[],         // mensagens com substitucões aplicadas (redact + pseudonymize)
  report: Finding[],           // findings de regras redact (igual ao atual)
  blocked: boolean,            // true se qualquer regra block disparou
  blockFindings: BlockFinding[], // [{ ruleId, label, count }] das regras block que dispararam
  reverseMap: Map<string, string>, // alias → original (de regras pseudonymize)
}
```

**Lógica por mode**:
- `disabled`: ignora a regra — não processa
- `redact`: comportamento atual — substitui por `entry.replacement`, acumula em `report`
- `block`: detecta matches sem substituir — se encontrou, acumula em `blockFindings` e seta `blocked = true`
- `pseudonymize`: cada valor único encontrado recebe alias sequencial (`[ALIAS_1]`, `[ALIAS_2]`, …); substitui no texto; acumula alias→original em `reverseMap`

**Done when**:
- [ ] Regras `disabled` são ignoradas
- [ ] Regras `redact` comportam-se exatamente como antes (sem regressão)
- [ ] Regras `block` setam `blocked: true` e populam `blockFindings` sem modificar o texto
- [ ] Regras `pseudonymize` substituem por aliases e retornam `reverseMap` com mapeamento reversível
- [ ] O mesmo valor encontrado em múltiplas posições recebe o mesmo alias (deduplicação por valor)
- [ ] `sanitizeText` também retorna `{ sanitized, findings, blocked, blockFindings, reverseMap }` para consistência

**Gate**: manual — criar regra com `mode: "block"` no config.json, chamar `sanitizeMessages` com texto que casa, verificar `blocked: true` e `blockFindings` populado

---

### T3: Atualizar chat route para tratar `block` e reverter aliases

**What**: No chat route, após `sanitizeMessages`, verificar `blocked`. Se true, retornar resposta sintética sem chamar o provider. Se `reverseMap` não estiver vazio, aplicar reversão no `result.text` antes de retornar ao cliente.

**Where**: `src/routes/chat.js`

**Depends on**: T2

**Requirement**: RAM-03, RAM-04

**Done when**:
- [ ] Se `blocked === true`: retornar resposta no formato `chat.completion` com `finish_reason: "content_filter"` e `content` descrevendo as regras que dispararam (ex: `"Requisição bloqueada por política. Dados sensíveis detectados: CPF (2 ocorrências), CNPJ (1 ocorrência)."`)
- [ ] A resposta de bloqueio inclui `gateway.blocked: true` e `gateway.block_findings` no corpo
- [ ] Requisição bloqueada é registrada no log com `blocked: true` (sem chamar o provider — sem `responseTokens`)
- [ ] Se `reverseMap.size > 0` após resposta do provider (non-stream): aplicar reversão no `result.text` antes de montar a resposta JSON
- [ ] Reversão: iterar sobre `reverseMap` e substituir todas as ocorrências de cada alias pelo valor original
- [ ] Streaming com `reverseMap` não-vazio: responder normalmente sem tentativa de reversão (limitation aceita)

**Gate**: manual — regra com `mode: "block"` + texto com CPF → espera resposta com `finish_reason: "content_filter"` e sem chamada ao provider; regra `pseudonymize` → verificar que a resposta do provider tem os valores originais de volta

---

### T4: Aceitar `mode` no CRUD de regras do admin route [P]

**What**: `POST /admin/blocklist` e `PATCH /admin/blocklist/:id` devem aceitar e validar o campo `mode`. Validar que o valor está entre os 4 permitidos.

**Where**: `src/routes/admin.js`

**Depends on**: T1

**Requirement**: RAM-01

**Done when**:
- [ ] `POST /admin/blocklist` aceita `mode` no body e passa para `addBlocklistEntry()`
- [ ] `PATCH /admin/blocklist/:id` aceita `mode` no body via `updateBlocklistEntry()`
- [ ] Se `mode` for enviado com valor inválido → retornar `400` com mensagem `"mode inválido. Valores aceitos: disabled, redact, pseudonymize, block"`
- [ ] Se `mode` ausente no POST → `addBlocklistEntry` usa default `"redact"`
- [ ] `GET /admin/blocklist` retorna `mode` em cada regra (automático após T1)

**Gate**: manual — `curl -X POST /admin/blocklist -d '{"value":"teste","mode":"block"}' | jq .mode` → `"block"`; `curl -X POST /admin/blocklist -d '{"value":"x","mode":"invalido"}' | jq .error`

---

### T5: Atualizar UI admin — seletor de mode com tooltips e badges [P]

**What**: Substituir o toggle `active` por um seletor de 4 opções no formulário de regras. Adicionar badges coloridos na listagem. Adicionar tooltips descritivos em cada opção.

**Where**: `public/index.html`

**Depends on**: T4

**Requirement**: RAM-05

**Modos e cores dos badges**:
| Mode | Label PT | Badge color |
|---|---|---|
| `disabled` | Desativado | cinza (`--muted`) |
| `redact` | Redigir | amarelo (`--yellow`) |
| `pseudonymize` | Pseudonimizar | azul/accent (`--accent`) |
| `block` | Bloquear | vermelho (`--red`) |

**Tooltips** (texto exato para cada opção):
- **Desativado**: "Regra ignorada. Nenhum processamento é aplicado."
- **Redigir**: "Substitui o dado pelo texto de substituição configurado e envia ao provider."
- **Pseudonimizar**: "Substitui o dado por um alias antes de enviar. A resposta é desmascarada automaticamente — o cliente recebe os valores originais. Em modo streaming, a reversão pode falhar."
- **Bloquear**: "Impede o envio ao provider. Retorna uma resposta sintética indicando qual dado sensível foi detectado."

**Done when**:
- [ ] Formulário exibe `<select>` (ou radio group) com as 4 opções de mode
- [ ] Cada opção tem tooltip visível ao hover (pode ser `title` attribute ou CSS tooltip)
- [ ] Submit envia `mode` no payload (não mais `active`)
- [ ] Listagem de regras exibe badge colorido com o mode de cada regra
- [ ] Ao editar regra existente, o mode atual aparece pré-selecionado
- [ ] Regras legadas (sem `mode`, apenas `active`) exibem badge correto após normalização pelo backend

**Gate**: manual — abrir `http://localhost:3000`, criar regra com mode "Bloquear", verificar badge vermelho na listagem; editar e mudar para "Pseudonimizar", verificar badge azul

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 (store) ──→ T2 (sanitizer) ──→ T3 (chat route)

Phase 2 (Parallel — após T1):
  T1 completo, então em paralelo com T2:
    T4 (admin routes) [P]

Phase 3 (Sequential):
  T4 completo, então:
    T5 (UI)
```

**Nota**: T3 só pode começar após T2 porque precisa do novo contrato de retorno de `sanitizeMessages`.

---

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram | Status |
|---|---|---|---|
| T1 | None | Início | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T1 | T1 → T4 [P] | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |

---

## Requirement Traceability

| Requirement ID | Task(s) | Status |
|---|---|---|
| RAM-01 | T1, T4 | Pending |
| RAM-02 | T2 | Pending |
| RAM-03 | T3 | Pending |
| RAM-04 | T3 | Pending |
| RAM-05 | T5 | Pending |

**Coverage**: 5 total, 5 mapeados, 0 não mapeados ✅
