import type { BlocklistEntry, BlocklistFinding, SanitizeFinding } from '../types';
import { store } from './store.service';

export interface SanitizeTextResult {
  sanitized: string;
  findings: SanitizeFinding[];
  blocked: boolean;
  blockFindings: BlocklistFinding[];
}

export interface SanitizeMessageResult {
  messageIndex: number;
  role: string;
  findings: SanitizeFinding[];
}

export interface SanitizeMessagesResult {
  messages: Array<{ role: string; content: string | null }>;
  report: SanitizeMessageResult[];
  blocked: boolean;
  blockFindings: BlocklistFinding[];
}

function compileRule(entry: BlocklistEntry): RegExp | null {
  try {
    const pattern =
      entry.type === 'regex'
        ? entry.value
        : entry.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(pattern, 'gi');
  } catch {
    return null;
  }
}

export class SanitizerService {
  sanitizeText(text: string): SanitizeTextResult {
    if (!text || typeof text !== 'string') {
      return { sanitized: text, findings: [], blocked: false, blockFindings: [] };
    }

    const entries = store.getBlocklist().filter((e) => e.mode !== 'disabled');
    let sanitized = text;
    const findings: SanitizeFinding[] = [];
    const blockFindings: BlocklistFinding[] = [];
    let blocked = false;

    for (const entry of entries) {
      const regex = compileRule(entry);
      if (!regex) continue;

      regex.lastIndex = 0;
      const matches = sanitized.match(new RegExp(regex.source, regex.flags));
      if (!matches || matches.length === 0) continue;

      const label = entry.label || entry.id;

      if (entry.mode === 'block') {
        blocked = true;
        blockFindings.push({ ruleId: entry.id, label, count: matches.length });
      } else {
        findings.push({ label, count: matches.length });
        sanitized = sanitized.replace(
          new RegExp(regex.source, regex.flags),
          entry.replacement || '[REMOVIDO]'
        );
      }
    }

    return { sanitized, findings, blocked, blockFindings };
  }

  sanitizeMessages(
    messages: Array<{ role: string; content: unknown }>,
    enabledRoles?: { system?: boolean; user?: boolean; tool?: boolean }
  ): SanitizeMessagesResult {
    const report: SanitizeMessageResult[] = [];
    const blockFindings: BlocklistFinding[] = [];
    let blocked = false;

    const sanitizedMessages = messages.map((msg, idx) => {
      const roleEnabled =
        !enabledRoles ||
        (msg.role === 'system' ? (enabledRoles.system ?? true) :
         msg.role === 'user'   ? (enabledRoles.user   ?? true) :
         msg.role === 'tool'   ? (enabledRoles.tool   ?? true) :
         false);

      if (!roleEnabled) return { ...msg, content: msg.content as string | null };

      const content =
        typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

      const result = this.sanitizeText(content);

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
        content: typeof msg.content === 'string' ? result.sanitized : (msg.content as string | null),
      };
    });

    return { messages: sanitizedMessages as SanitizeMessagesResult['messages'], report, blocked, blockFindings };
  }

  listRules() {
    return store.getBlocklist().map(({ id, label, type, replacement, mode, builtin, category }) => ({
      id,
      label,
      type,
      replacement,
      mode,
      builtin,
      category,
    }));
  }
}

export const sanitizer = new SanitizerService();
