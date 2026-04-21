import Database from 'better-sqlite3';
import { mkdirSync, writeFileSync, readdirSync, statSync, rmSync, existsSync } from 'fs';
import path from 'path';
import logger from '../utils/logger';

export interface ActivityLogEntry {
  requestId: string;
  userName: string;
  tokenPreview: string;
  sanitizedMessages: Array<{ role: string; content: unknown }>;
  llmResponse: string | null;
  providerModel: string;
  blocked: boolean;
}

export interface ActivityLogRow {
  id: number;
  request_id: string;
  user_name: string;
  token_preview: string;
  message_preview: string;
  provider_model: string;
  blocked: boolean;
  file_path: string | null;
  created_at: string;
}

const DB_PATH = path.resolve('data/activity.db');
const LOGS_BASE = path.resolve('logs/data');

function initDb(): Database.Database {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id    TEXT NOT NULL,
      user_name     TEXT NOT NULL,
      token_preview TEXT NOT NULL,
      message_preview TEXT NOT NULL,
      provider_model  TEXT NOT NULL,
      blocked       INTEGER NOT NULL DEFAULT 0,
      file_path     TEXT,
      created_at    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_logs(created_at);
  `);
  return db;
}

function extractMessagePreview(messages: Array<{ role: string; content: unknown }>): string {
  const last = [...messages].reverse().find((m) => m.role === 'user');
  if (!last) return '';
  const text = typeof last.content === 'string' ? last.content : JSON.stringify(last.content);
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

## Sanitized Request

\`\`\`json
${JSON.stringify(entry.sanitizedMessages, null, 2)}
\`\`\`

## LLM Response

${response}
`;
}

function createActivityLogService() {
  let db: Database.Database | null = null;

  function getDb(): Database.Database {
    if (!db) db = initDb();
    return db;
  }

  function log(entry: ActivityLogEntry): void {
    try {
      const now = new Date().toISOString();
      const d = new Date();
      const yyyy = d.getFullYear().toString();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dir = path.join(LOGS_BASE, yyyy, mm);
      mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, `${yyyy}-${mm}-${dd}-${entry.requestId}.md`);

      writeFileSync(filePath, buildMarkdown(entry, now), 'utf8');

      const preview = extractMessagePreview(entry.sanitizedMessages);
      const database = getDb();
      database.prepare(
        `INSERT INTO activity_logs
         (request_id, user_name, token_preview, message_preview, provider_model, blocked, file_path, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        entry.requestId,
        entry.userName,
        entry.tokenPreview,
        preview,
        entry.providerModel,
        entry.blocked ? 1 : 0,
        filePath,
        now
      );
    } catch (err) {
      logger.error('[activity-log] failed to log entry', { error: (err as Error).message });
    }
  }

  function list(page: number, limit: number): { rows: ActivityLogRow[]; total: number } {
    const database = getDb();
    const offset = (page - 1) * limit;

    const { count } = database
      .prepare('SELECT COUNT(*) as count FROM activity_logs')
      .get() as { count: number };

    const rows = database
      .prepare(
        `SELECT id, request_id, user_name, token_preview, message_preview, provider_model, blocked, file_path, created_at
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

  function deleteOlderThan(days: number): { rows: number; files: number } {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    let deletedFiles = 0;

    try {
      const database = getDb();
      const { changes: deletedRows } = database
        .prepare('DELETE FROM activity_logs WHERE created_at < ?')
        .run(cutoff) as { changes: number };

      if (existsSync(LOGS_BASE)) {
        for (const year of readdirSync(LOGS_BASE)) {
          const yearDir = path.join(LOGS_BASE, year);
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

  return { log, list, deleteOlderThan };
}

export const activityLog = createActivityLogService();
