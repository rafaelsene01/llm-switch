import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import path from 'path';
import type { GatewayProvider } from '../types';

export const ALLOWED_PROVIDER_TYPES = ['openrouter', 'ollama', 'lmstudio'] as const;
export type AllowedProviderType = typeof ALLOWED_PROVIDER_TYPES[number];

const PROVIDER_META: Record<AllowedProviderType, { baseName: string; type: 'cloud' | 'local'; defaultUrl?: string }> = {
  openrouter: { baseName: 'OpenRouter', type: 'cloud' },
  ollama:     { baseName: 'Ollama',     type: 'local', defaultUrl: 'http://localhost:11434' },
  lmstudio:   { baseName: 'LM Studio', type: 'local', defaultUrl: 'http://localhost:1234' },
};

interface ProviderRow {
  id: string;
  provider_type: string;
  name: string;
  label: string | null;
  type: string;
  key: string | null;
  url: string | null;
  configured: number;
  enabled: number;
}

function rowToProvider(row: ProviderRow): GatewayProvider {
  return {
    id: row.id,
    providerType: row.provider_type,
    name: row.name,
    label: row.label ?? undefined,
    type: row.type as 'cloud' | 'local',
    key: row.key ?? undefined,
    url: row.url ?? undefined,
    configured: Boolean(row.configured),
    enabled: Boolean(row.enabled),
  };
}

function createProvidersDb(dbFile?: string) {
  const resolvedFile = dbFile ?? path.resolve('data/gateway.db');
  mkdirSync(path.dirname(resolvedFile), { recursive: true });
  const db = new Database(resolvedFile);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS providers (
      id           TEXT PRIMARY KEY,
      provider_type TEXT NOT NULL,
      name         TEXT NOT NULL,
      label        TEXT,
      type         TEXT NOT NULL,
      key          TEXT,
      url          TEXT,
      configured   INTEGER NOT NULL DEFAULT 0,
      enabled      INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // migration: add label column if it doesn't exist yet
  const cols = (db.prepare("PRAGMA table_info(providers)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes('label')) {
    db.exec('ALTER TABLE providers ADD COLUMN label TEXT');
  }

  function list(): GatewayProvider[] {
    return (db.prepare('SELECT * FROM providers ORDER BY created_at ASC').all() as ProviderRow[]).map(rowToProvider);
  }

  function getById(id: string): GatewayProvider | null {
    const row = db.prepare('SELECT * FROM providers WHERE id = ?').get(id) as ProviderRow | undefined;
    return row ? rowToProvider(row) : null;
  }

  function add(providerType: AllowedProviderType, label?: string): GatewayProvider {
    const meta = PROVIDER_META[providerType];
    const existing = db.prepare(
      'SELECT id FROM providers WHERE provider_type = ? ORDER BY created_at ASC'
    ).all(providerType) as { id: string }[];
    const count = existing.length;

    let id: string = providerType;
    if (count > 0) {
      const existingIds = new Set(existing.map((e) => e.id));
      for (let n = 2; ; n++) {
        const candidate = `${providerType}_${n}`;
        if (!existingIds.has(candidate)) { id = candidate; break; }
      }
    }

    const name = count === 0 ? meta.baseName : `${meta.baseName} ${count + 1}`;
    const url = meta.defaultUrl ?? null;

    db.prepare(
      'INSERT INTO providers (id, provider_type, name, label, type, url) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, providerType, name, label ?? null, meta.type, url);

    return getById(id)!;
  }

  function update(
    id: string,
    patch: Partial<Pick<GatewayProvider, 'key' | 'url' | 'enabled' | 'label'>>
  ): GatewayProvider | null {
    const current = getById(id);
    if (!current) return null;

    const newKey = 'key' in patch ? patch.key : current.key;
    const newUrl = 'url' in patch ? patch.url : current.url;
    const newLabel = 'label' in patch ? (patch.label ?? null) : (current.label ?? null);
    const configured = current.type === 'cloud' ? Boolean(newKey) : Boolean(newUrl);

    let newEnabled: boolean;
    if ('enabled' in patch && patch.enabled !== undefined) {
      newEnabled = Boolean(patch.enabled) && configured;
    } else if (!current.configured && configured) {
      newEnabled = true;
    } else {
      newEnabled = current.enabled;
    }

    db.prepare(
      'UPDATE providers SET key=?, url=?, label=?, configured=?, enabled=? WHERE id=?'
    ).run(newKey ?? null, newUrl ?? null, newLabel, configured ? 1 : 0, newEnabled ? 1 : 0, id);

    return getById(id)!;
  }

  function clearKey(id: string): boolean {
    const current = getById(id);
    if (!current) return false;
    const meta = PROVIDER_META[current.providerType as AllowedProviderType];
    const defaultUrl = meta?.defaultUrl ?? null;
    db.prepare(
      'UPDATE providers SET key=NULL, url=?, configured=0, enabled=0 WHERE id=?'
    ).run(defaultUrl, id);
    return true;
  }

  function remove(id: string): boolean {
    const result = db.prepare('DELETE FROM providers WHERE id = ?').run(id);
    return result.changes > 0;
  }

  return { list, getById, add, update, clearKey, remove };
}

export type ProvidersDb = ReturnType<typeof createProvidersDb>;
export const providersDb = createProvidersDb();
export { createProvidersDb };
