import Database from 'better-sqlite3';
import { mkdirSync, writeFileSync, readdirSync, statSync, rmSync, existsSync } from 'fs';
import path from 'path';
import logger from '../utils/logger';

export interface ActivityLogEntry {
  requestId: string;
  userName: string;
  tokenPreview: string;
  originalMessages: Array<{ role: string; content: unknown }>;
  llmResponse: string | null;
  providerModel: string;
  blocked: boolean;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  inputCostUsd: number;
  outputCostUsd: number;
  errorMessage?: string;
}

export interface ModelStat {
  model: string;
  requestCount: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCostUsd: number;
  inputCostUsd: number;
  outputCostUsd: number;
}

export interface UserStat {
  user: string;
  requestCount: number;
  totalTokens: number;
  totalCostUsd: number;
  models: { model: string; requestCount: number; totalTokens: number; totalCostUsd: number }[];
}

export interface ActivityLogRow {
  id: number;
  request_id: string;
  user_name: string;
  token_preview: string;
  message_preview: string;
  provider_model: string;
  provider_id: string;
  blocked: boolean;
  file_path: string | null;
  created_at: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  input_cost_usd: number;
  output_cost_usd: number;
  error_message: string | null;
}

function initDb(dbPath: string): Database.Database {
  if (dbPath !== ':memory:') mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id      TEXT NOT NULL,
      user_name       TEXT NOT NULL,
      token_preview   TEXT NOT NULL,
      message_preview TEXT NOT NULL,
      provider_model  TEXT NOT NULL,
      blocked         INTEGER NOT NULL DEFAULT 0,
      file_path       TEXT,
      created_at      TEXT NOT NULL,
      prompt_tokens     INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens      INTEGER NOT NULL DEFAULT 0,
      cost_usd          REAL    NOT NULL DEFAULT 0,
      input_cost_usd    REAL    NOT NULL DEFAULT 0,
      output_cost_usd   REAL    NOT NULL DEFAULT 0,
      error_message     TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_logs(created_at);
  `);
  // Migrate existing databases that lack columns
  for (const [col, type] of [
    ['prompt_tokens', 'INTEGER NOT NULL DEFAULT 0'],
    ['completion_tokens', 'INTEGER NOT NULL DEFAULT 0'],
    ['total_tokens', 'INTEGER NOT NULL DEFAULT 0'],
    ['cost_usd', 'REAL NOT NULL DEFAULT 0'],
    ['input_cost_usd', 'REAL NOT NULL DEFAULT 0'],
    ['output_cost_usd', 'REAL NOT NULL DEFAULT 0'],
    ['error_message', 'TEXT'],
    ['provider_id', 'TEXT NOT NULL DEFAULT \'\''],
  ]) {
    try {
      db.exec(`ALTER TABLE activity_logs ADD COLUMN ${col} ${type}`);
    } catch {
      // Column already exists — safe to ignore
    }
  }
  return db;
}

function extractMessagePreview(messages: Array<{ role: string; content: unknown }>): string {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return '';
  const text = typeof first.content === 'string' ? first.content : JSON.stringify(first.content);
  return text.length > 200 ? text.slice(0, 200) + '...' : text;
}

function buildMarkdown(entry: ActivityLogEntry, now: string): string {
  const status = entry.blocked ? 'BLOCKED' : 'OK';
  const response = entry.blocked
    ? 'BLOCKED — request was rejected by content policy'
    : (entry.llmResponse ?? '(empty response)');

  return `# Activity Log — ${entry.requestId}

**User**: ${entry.userName}
**Token**: ${entry.tokenPreview}...
**Model**: ${entry.providerModel}
**Date**: ${now}
**Status**: ${status}
**Tokens**: ${entry.promptTokens} input / ${entry.completionTokens} output / ${entry.totalTokens} total
**Cost**: input $${entry.inputCostUsd.toFixed(6)} / output $${entry.outputCostUsd.toFixed(6)} / total $${entry.costUsd.toFixed(6)}

## Original Request

\`\`\`json
${JSON.stringify(entry.originalMessages, null, 2)}
\`\`\`

## LLM Response

${response}
`;
}

export function createActivityLogService(
  dbPath = path.resolve('data/activity.db'),
  logsBase = path.resolve('logs/data')
) {
  let db: Database.Database | null = null;

  function getDb(): Database.Database {
    if (!db) db = initDb(dbPath);
    return db;
  }

  function log(entry: ActivityLogEntry): void {
    try {
      const now = new Date().toISOString();
      const d = new Date();
      const yyyy = d.getFullYear().toString();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dir = path.join(logsBase, yyyy, mm);
      mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, `${yyyy}-${mm}-${dd}-${entry.requestId}.md`);

      writeFileSync(filePath, buildMarkdown(entry, now), 'utf8');

      const preview = extractMessagePreview(entry.originalMessages);
      const providerId = entry.providerModel.slice(0, entry.providerModel.indexOf(':')) || entry.providerModel;
      getDb().prepare(
        `INSERT INTO activity_logs
         (request_id, user_name, token_preview, message_preview, provider_model, provider_id, blocked, file_path, created_at,
          prompt_tokens, completion_tokens, total_tokens, cost_usd, input_cost_usd, output_cost_usd, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        entry.requestId,
        entry.userName,
        entry.tokenPreview,
        preview,
        entry.providerModel,
        providerId,
        entry.blocked ? 1 : 0,
        filePath,
        now,
        entry.promptTokens ?? 0,
        entry.completionTokens ?? 0,
        entry.totalTokens ?? 0,
        entry.costUsd ?? 0,
        entry.inputCostUsd ?? 0,
        entry.outputCostUsd ?? 0,
        entry.errorMessage ?? null
      );
    } catch (err) {
      logger.error('[activity-log] failed to log entry', { error: (err as Error).message });
    }
  }

  function getById(id: number): ActivityLogRow | null {
    const row = getDb()
      .prepare(
        `SELECT id, request_id, user_name, token_preview, message_preview, provider_model, provider_id, blocked, file_path, created_at,
                prompt_tokens, completion_tokens, total_tokens, cost_usd, input_cost_usd, output_cost_usd, error_message
         FROM activity_logs WHERE id = ?`
      )
      .get(id) as ActivityLogRow | undefined;
    if (!row) return null;
    return { ...row, blocked: Boolean(row.blocked) };
  }

  function list(page: number, limit: number, userFilter?: string): { rows: ActivityLogRow[]; total: number } {
    const offset = (page - 1) * limit;
    const db = getDb();

    if (userFilter) {
      const pattern = `%${userFilter}%`;
      const { count } = db
        .prepare('SELECT COUNT(*) as count FROM activity_logs WHERE user_name LIKE ?')
        .get(pattern) as { count: number };
      const rows = db
        .prepare(
          `SELECT id, request_id, user_name, token_preview, message_preview, provider_model, provider_id, blocked, file_path, created_at,
                  prompt_tokens, completion_tokens, total_tokens, cost_usd, input_cost_usd, output_cost_usd, error_message
           FROM activity_logs
           WHERE user_name LIKE ?
           ORDER BY created_at DESC
           LIMIT ? OFFSET ?`
        )
        .all(pattern, limit, offset) as ActivityLogRow[];
      return {
        rows: rows.map((r) => ({ ...r, blocked: Boolean(r.blocked) })),
        total: count,
      };
    }

    const { count } = db
      .prepare('SELECT COUNT(*) as count FROM activity_logs')
      .get() as { count: number };
    const rows = db
      .prepare(
        `SELECT id, request_id, user_name, token_preview, message_preview, provider_model, provider_id, blocked, file_path, created_at,
                prompt_tokens, completion_tokens, total_tokens, cost_usd, input_cost_usd, output_cost_usd, error_message
         FROM activity_logs
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(limit, offset) as ActivityLogRow[];

    return {
      rows: rows.map((r) => ({ ...r, blocked: Boolean(r.blocked) })),
      total: count,
    };
  }

  function deleteById(id: number): boolean {
    const row = getDb()
      .prepare('SELECT file_path FROM activity_logs WHERE id = ?')
      .get(id) as { file_path: string | null } | undefined;
    if (!row) return false;
    const { changes } = getDb()
      .prepare('DELETE FROM activity_logs WHERE id = ?')
      .run(id) as { changes: number };
    if (changes === 0) return false;
    if (row.file_path && existsSync(row.file_path)) {
      try { rmSync(row.file_path); } catch { /* ignore */ }
    }
    return true;
  }

  function deleteAll(): number {
    const { changes } = getDb()
      .prepare('DELETE FROM activity_logs')
      .run() as { changes: number };
    if (existsSync(logsBase)) {
      try { rmSync(logsBase, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    return changes;
  }

  function deleteOlderThan(days: number): { rows: number; files: number } {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    let deletedFiles = 0;

    try {
      const { changes: deletedRows } = getDb()
        .prepare('DELETE FROM activity_logs WHERE created_at < ?')
        .run(cutoff) as { changes: number };

      if (existsSync(logsBase)) {
        for (const year of readdirSync(logsBase)) {
          const yearDir = path.join(logsBase, year);
          if (!statSync(yearDir).isDirectory()) continue;
          for (const month of readdirSync(yearDir)) {
            const monthDir = path.join(yearDir, month);
            if (!statSync(monthDir).isDirectory()) continue;
            for (const file of readdirSync(monthDir)) {
              if (!file.endsWith('.md')) continue;
              const filePath = path.join(monthDir, file);
              if (statSync(filePath).mtime < new Date(cutoff)) {
                rmSync(filePath);
                deletedFiles++;
              }
            }
            if (readdirSync(monthDir).length === 0) rmSync(monthDir, { recursive: true });
          }
          if (readdirSync(yearDir).length === 0) rmSync(yearDir, { recursive: true });
        }
      }

      return { rows: deletedRows, files: deletedFiles };
    } catch (err) {
      logger.error('[activity-log] cleanup failed', { error: (err as Error).message });
      return { rows: 0, files: 0 };
    }
  }

  function analytics(): { byModel: ModelStat[]; byUser: UserStat[] } {
    const db = getDb();

    const byModel = db.prepare(`
      SELECT CASE WHEN instr(provider_model, ':') > 0
                  THEN substr(provider_model, instr(provider_model, ':') + 1)
                  ELSE provider_model END AS model,
             COUNT(*)                   AS requestCount,
             SUM(total_tokens)          AS totalTokens,
             SUM(prompt_tokens)         AS promptTokens,
             SUM(completion_tokens)     AS completionTokens,
             SUM(cost_usd)              AS totalCostUsd,
             SUM(input_cost_usd)        AS inputCostUsd,
             SUM(output_cost_usd)       AS outputCostUsd
      FROM activity_logs
      GROUP BY CASE WHEN instr(provider_model, ':') > 0
                    THEN substr(provider_model, instr(provider_model, ':') + 1)
                    ELSE provider_model END
      ORDER BY totalTokens DESC
    `).all() as ModelStat[];

    type UserModelRow = { user: string; model: string; requestCount: number; totalTokens: number; totalCostUsd: number };
    const userModelRows = db.prepare(`
      SELECT user_name AS user,
             CASE WHEN instr(provider_model, ':') > 0
                  THEN substr(provider_model, instr(provider_model, ':') + 1)
                  ELSE provider_model END AS model,
             COUNT(*)       AS requestCount,
             SUM(total_tokens) AS totalTokens,
             SUM(cost_usd)     AS totalCostUsd
      FROM activity_logs
      GROUP BY user_name,
               CASE WHEN instr(provider_model, ':') > 0
                    THEN substr(provider_model, instr(provider_model, ':') + 1)
                    ELSE provider_model END
      ORDER BY user_name, totalTokens DESC
    `).all() as UserModelRow[];

    const userMap = new Map<string, UserStat>();
    for (const row of userModelRows) {
      if (!userMap.has(row.user)) {
        userMap.set(row.user, { user: row.user, requestCount: 0, totalTokens: 0, totalCostUsd: 0, models: [] });
      }
      const stat = userMap.get(row.user)!;
      stat.requestCount += row.requestCount;
      stat.totalTokens += row.totalTokens;
      stat.totalCostUsd += row.totalCostUsd;
      stat.models.push({ model: row.model, requestCount: row.requestCount, totalTokens: row.totalTokens, totalCostUsd: row.totalCostUsd });
    }

    const byUser = [...userMap.values()].sort((a, b) => b.totalTokens - a.totalTokens);

    return { byModel, byUser };
  }

  function getModelUsage(modelValue: string, since: string): { tokens: number; requests: number } {
    const result = getDb()
      .prepare(
        `SELECT COALESCE(SUM(total_tokens), 0) AS tokens, COUNT(*) AS requests
         FROM activity_logs
         WHERE provider_model = ?
           AND created_at >= ?
           AND (error_message IS NULL OR error_message = '')`
      )
      .get(modelValue, since) as { tokens: number; requests: number };
    return result;
  }

  return { log, list, getById, deleteById, deleteAll, deleteOlderThan, analytics, getModelUsage };
}

export const activityLog = createActivityLogService();
