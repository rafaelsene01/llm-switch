import { getBlocklist } from "../data/store.js";

// ─── SANITIZADOR ─────────────────────────────────────────────────────────────
//
// Cada regra tem um `mode` que determina o comportamento ao detectar um match:
//   disabled — regra ignorada
//   redact   — substitui pelo `replacement` e envia ao provider
//   block    — não envia ao provider; retorna resposta sintética

function compileRule(entry) {
  try {
    const pattern = entry.type === "regex"
      ? entry.value
      : entry.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(pattern, "gi");
  } catch {
    return null;
  }
}

/**
 * Sanitiza um texto usando todas as regras ativas do store.
 * Retorna { sanitized, findings, blocked, blockFindings }
 */
export function sanitizeText(text) {
  if (!text || typeof text !== "string") {
    return { sanitized: text, findings: [], blocked: false, blockFindings: [] };
  }

  const entries = getBlocklist().filter((e) => e.mode !== "disabled");
  let sanitized = text;
  const findings = [];
  const blockFindings = [];
  let blocked = false;

  for (const entry of entries) {
    const regex = compileRule(entry);
    if (!regex) continue;

    regex.lastIndex = 0;
    const matches = sanitized.match(new RegExp(regex.source, regex.flags));
    if (!matches || matches.length === 0) continue;

    const label = entry.label || entry.id;

    if (entry.mode === "block") {
      blocked = true;
      blockFindings.push({ ruleId: entry.id, label, count: matches.length });
    } else {
      // redact
      findings.push({ label, count: matches.length });
      regex.lastIndex = 0;
      sanitized = sanitized.replace(new RegExp(regex.source, regex.flags), entry.replacement || "[REMOVIDO]");
    }
  }

  return { sanitized, findings, blocked, blockFindings };
}

/**
 * Sanitiza uma lista de mensagens (formato OpenAI/Anthropic).
 * Retorna { messages, report, blocked, blockFindings }
 */
export function sanitizeMessages(messages) {
  const report = [];
  const blockFindings = [];
  let blocked = false;

  const sanitizedMessages = messages.map((msg, idx) => {
    const content = typeof msg.content === "string"
      ? msg.content
      : JSON.stringify(msg.content);

    const result = sanitizeText(content);

    if (result.findings.length > 0) {
      report.push({ messageIndex: idx, role: msg.role, findings: result.findings });
    }
    if (result.blocked) {
      blocked = true;
      for (const bf of result.blockFindings) {
        const exists = blockFindings.find((x) => x.ruleId === bf.ruleId);
        if (exists) exists.count += bf.count;
        else blockFindings.push({ ...bf });
      }
    }

    return {
      ...msg,
      content: typeof msg.content === "string" ? result.sanitized : msg.content,
    };
  });

  return { messages: sanitizedMessages, report, blocked, blockFindings };
}

/**
 * Retorna resumo das regras ativas (para /v1/gateway/rules).
 */
export function listRules() {
  return getBlocklist().map(({ id, label, type, replacement, mode, builtin, category }) => ({
    id, label, type, replacement, mode, builtin, category,
  }));
}
