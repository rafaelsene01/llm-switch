import { getBlocklist } from "../data/store.js";

// ─── SANITIZADOR ─────────────────────────────────────────────────────────────
//
// Todas as regras vivem no store (data/config.json) e são editáveis pela UI.
// Os padrões default ficam em src/data/defaults/blocklist.js.
//
// Cada regra tem:
//   value       — string regex (type="regex") ou texto literal (type="word")
//   type        — "regex" | "word"
//   replacement — o que substitui no prompt
//   active      — se false, a regra é ignorada

/**
 * Compila uma entrada do store em um RegExp pronto para uso.
 * Retorna null se a regex for inválida.
 */
function compileRule(entry) {
  try {
    const pattern = entry.type === "regex"
      ? entry.value
      : entry.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // escapa para match literal
    return new RegExp(pattern, "gi");
  } catch {
    return null; // regex inválida — ignora silenciosamente
  }
}

/**
 * Sanitiza um texto usando todas as regras ativas do store.
 * Retorna { sanitized: string, findings: Array<{label, count}> }
 */
export function sanitizeText(text) {
  if (!text || typeof text !== "string") return { sanitized: text, findings: [] };

  const entries  = getBlocklist().filter((e) => e.active);
  let sanitized  = text;
  const findings = [];

  for (const entry of entries) {
    const regex = compileRule(entry);
    if (!regex) continue;

    // Reseta lastIndex para evitar bugs de estado em regex com /g
    regex.lastIndex = 0;
    const matches = sanitized.match(new RegExp(regex.source, regex.flags));
    if (matches && matches.length > 0) {
      findings.push({ label: entry.label || entry.id, count: matches.length });
      regex.lastIndex = 0;
      sanitized = sanitized.replace(new RegExp(regex.source, regex.flags), entry.replacement || "[REMOVIDO]");
    }
  }

  return { sanitized, findings };
}

/**
 * Sanitiza uma lista de mensagens (formato OpenAI/Anthropic).
 * Retorna { messages: Array, report: Array }
 */
export function sanitizeMessages(messages) {
  const report = [];

  const sanitizedMessages = messages.map((msg, idx) => {
    const content = typeof msg.content === "string"
      ? msg.content
      : JSON.stringify(msg.content);

    const { sanitized, findings } = sanitizeText(content);

    if (findings.length > 0) {
      report.push({ messageIndex: idx, role: msg.role, findings });
    }

    return {
      ...msg,
      content: typeof msg.content === "string" ? sanitized : msg.content,
    };
  });

  return { messages: sanitizedMessages, report };
}

/**
 * Retorna resumo das regras ativas (para /v1/gateway/rules).
 */
export function listRules() {
  return getBlocklist().map(({ id, label, type, replacement, active, builtin, category }) => ({
    id, label, type, replacement, active, builtin, category,
  }));
}
