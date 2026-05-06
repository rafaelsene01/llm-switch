import Database from 'better-sqlite3';
import { existsSync, readFileSync, renameSync, mkdirSync } from 'fs';
import path from 'path';
import type { GatewayModel, GatewayUser, UserPublic } from '../types';
import type { ProviderModelInfo } from './providers.service';
import { providersDb, type ProvidersDb } from './providers-db.service';

interface ModelRow {
  id: string;
  value: string;
  label: string;
  active: number;
  input_cost_per1m: number | null;
  output_cost_per1m: number | null;
  rate_limit_json: string | null;
  created_at: string;
}

interface UserRow {
  id: string;
  name: string;
  api_key: string;
  model: string | null;
  allowed_models: string;
  created_at: string;
  active: number;
}

interface ExportPayload {
  _gateway_export: boolean;
  _module: string;
  _version: string;
  _exported_at: string;
  models?: GatewayModel[];
  users?: GatewayUser[];
}

interface ImportReport {
  added: Record<string, number>;
  skipped: Record<string, number>;
}

function rowToModel(row: ModelRow): GatewayModel {
  return {
    id: row.id,
    value: row.value,
    label: row.label,
    active: Boolean(row.active),
    ...(row.input_cost_per1m !== null && { inputCostPer1M: row.input_cost_per1m }),
    ...(row.output_cost_per1m !== null && { outputCostPer1M: row.output_cost_per1m }),
    ...(row.rate_limit_json ? { rateLimit: JSON.parse(row.rate_limit_json) } : {}),
  };
}

function rowToUser(row: UserRow): GatewayUser {
  return {
    id: row.id,
    name: row.name,
    key: row.api_key,
    model: row.model,
    allowedModels: JSON.parse(row.allowed_models),
    createdAt: row.created_at,
    active: Boolean(row.active),
  };
}

function migrateFromJson(db: Database.Database): void {
  const configFile = path.resolve('data/config.json');
  if (!existsSync(configFile)) return;

  try {
    const raw = JSON.parse(readFileSync(configFile, 'utf8')) as {
      models?: GatewayModel[];
      users?: GatewayUser[];
    };
    const models: GatewayModel[] = raw.models ?? [];
    const users: GatewayUser[] = raw.users ?? [];

    const insertModel = db.prepare(
      'INSERT OR IGNORE INTO models (id, value, label, active, input_cost_per1m, output_cost_per1m, rate_limit_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertUser = db.prepare(
      'INSERT OR IGNORE INTO users (id, name, api_key, model, allowed_models, created_at, active) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    db.transaction(() => {
      for (const m of models) {
        insertModel.run(
          m.id,
          m.value,
          m.label,
          m.active ? 1 : 0,
          m.inputCostPer1M ?? null,
          m.outputCostPer1M ?? null,
          m.rateLimit ? JSON.stringify(m.rateLimit) : null,
          new Date().toISOString()
        );
      }
      for (const u of users) {
        insertUser.run(
          u.id,
          u.name,
          u.key,
          u.model ?? null,
          JSON.stringify(u.allowedModels ?? []),
          u.createdAt,
          u.active ? 1 : 0
        );
      }
    })();

    renameSync(configFile, configFile + '.migrated');
    console.log(`[store] Migrated ${models.length} models and ${users.length} users from config.json to SQLite.`);
  } catch (err) {
    console.error('[store] Migration from config.json failed:', err);
  }
}

function createStore(dbFile?: string, _providers?: Pick<ProvidersDb, 'list'>) {
  const resolvedFile = dbFile ?? path.resolve('data/gateway.db');
  mkdirSync(path.dirname(resolvedFile), { recursive: true });

  const db = new Database(resolvedFile);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id                TEXT PRIMARY KEY,
      value             TEXT NOT NULL UNIQUE,
      label             TEXT NOT NULL,
      active            INTEGER NOT NULL DEFAULT 1,
      input_cost_per1m  REAL,
      output_cost_per1m REAL,
      rate_limit_json   TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS users (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL UNIQUE,
      api_key        TEXT NOT NULL UNIQUE,
      model          TEXT,
      allowed_models TEXT NOT NULL DEFAULT '[]',
      created_at     TEXT NOT NULL,
      active         INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Only migrate on the default (production) db, not in test mode
  if (!dbFile) {
    migrateFromJson(db);
  }

  const resolvedProviders = _providers ?? providersDb;

  // ── Models ─────────────────────────────────────────────────────────────────

  function getModels(): GatewayModel[] {
    const configuredIds = new Set(
      resolvedProviders.list().filter((p) => p.configured).map((p) => p.id)
    );
    const rows = db.prepare('SELECT * FROM models ORDER BY created_at ASC').all() as ModelRow[];
    return rows.map(rowToModel).filter((m) => configuredIds.has(m.value.split(':')[0]));
  }

  function addModel(model: Pick<GatewayModel, 'value' | 'label'>): GatewayModel {
    if (db.prepare('SELECT id FROM models WHERE value = ?').get(model.value)) {
      throw new Error(`Modelo "${model.value}" já existe.`);
    }
    const newModel: GatewayModel = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      value: model.value,
      label: model.label || model.value,
      active: true,
    };
    db.prepare('INSERT INTO models (id, value, label, active) VALUES (?, ?, ?, ?)').run(
      newModel.id,
      newModel.value,
      newModel.label,
      1
    );
    return newModel;
  }

  function syncModels(
    providerId: string,
    newModels: ProviderModelInfo[]
  ): { added: number; removed: number; models: GatewayModel[] } {
    const prefix = `${providerId}:`;
    const newValueSet = new Set(newModels.map((m) => `${prefix}${m.id}`));
    const currentForProvider = (
      db.prepare('SELECT * FROM models WHERE value LIKE ?').all(`${prefix}%`) as ModelRow[]
    ).map(rowToModel);
    const currentValueMap = new Map(currentForProvider.map((m) => [m.value, m]));

    let added = 0;

    db.transaction(() => {
      for (const m of currentForProvider) {
        if (!newValueSet.has(m.value)) {
          db.prepare('DELETE FROM models WHERE id = ?').run(m.id);
        }
      }
      for (const m of newModels) {
        const value = `${prefix}${m.id}`;
        if (!currentValueMap.has(value)) {
          db.prepare('INSERT OR IGNORE INTO models (id, value, label, active) VALUES (?, ?, ?, ?)').run(
            `m_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            value,
            m.name,
            1
          );
          added++;
        }
      }
    })();

    const removed = currentForProvider.filter((m) => !newValueSet.has(m.value)).length;
    const allModels = (
      db.prepare('SELECT * FROM models ORDER BY created_at ASC').all() as ModelRow[]
    ).map(rowToModel);
    return { added, removed, models: allModels };
  }

  function updateModel(
    id: string,
    patch: Partial<Pick<GatewayModel, 'active' | 'label' | 'inputCostPer1M' | 'outputCostPer1M' | 'rateLimit'>>
  ): GatewayModel | null {
    const row = db.prepare('SELECT * FROM models WHERE id = ?').get(id) as ModelRow | undefined;
    if (!row) return null;
    const updated = { ...rowToModel(row), ...patch };
    db.prepare(
      'UPDATE models SET label=?, active=?, input_cost_per1m=?, output_cost_per1m=?, rate_limit_json=? WHERE id=?'
    ).run(
      updated.label,
      updated.active ? 1 : 0,
      updated.inputCostPer1M ?? null,
      updated.outputCostPer1M ?? null,
      updated.rateLimit ? JSON.stringify(updated.rateLimit) : null,
      id
    );
    return updated;
  }

  function pruneUnconfiguredModels(configuredProviderIds: string[]): { removed: number } {
    const rows = db.prepare('SELECT id, value FROM models').all() as Pick<ModelRow, 'id' | 'value'>[];
    let removed = 0;
    db.transaction(() => {
      for (const row of rows) {
        if (!configuredProviderIds.includes(row.value.split(':')[0])) {
          db.prepare('DELETE FROM models WHERE id = ?').run(row.id);
          removed++;
        }
      }
    })();
    return { removed };
  }

  function deleteModel(id: string): boolean {
    const row = db.prepare('SELECT * FROM models WHERE id = ?').get(id) as ModelRow | undefined;
    if (!row) return false;
    const usersWithModel = db
      .prepare('SELECT name FROM users WHERE model = ?')
      .all(row.value) as { name: string }[];
    if (usersWithModel.length > 0) {
      throw new Error(
        `Modelo em uso pelos usuários: ${usersWithModel.map((u) => u.name).join(', ')}`
      );
    }
    db.prepare('DELETE FROM models WHERE id = ?').run(id);
    return true;
  }

  function deleteProviderModels(providerId: string): number {
    const result = db.prepare('DELETE FROM models WHERE value LIKE ?').run(`${providerId}:%`);
    return result.changes;
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  function getUsers(): UserPublic[] {
    const rows = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as UserRow[];
    return rows.map((row) => {
      const { key, ...rest } = rowToUser(row);
      return { ...rest, keyPreview: key ? key.slice(0, 8) + '...' : '???' };
    });
  }

  function getUserByKey(key: string): GatewayUser | null {
    const row = db.prepare('SELECT * FROM users WHERE api_key = ?').get(key) as UserRow | undefined;
    return row ? rowToUser(row) : null;
  }

  function addUser(user: Omit<GatewayUser, 'id' | 'createdAt' | 'active'>): GatewayUser {
    if (db.prepare('SELECT id FROM users WHERE name = ?').get(user.name)) {
      throw new Error(`Usuário "${user.name}" já existe.`);
    }
    if (db.prepare('SELECT id FROM users WHERE api_key = ?').get(user.key)) {
      throw new Error('Essa API key já está em uso.');
    }
    const newUser: GatewayUser = {
      id: `u_${Date.now()}`,
      name: user.name,
      key: user.key,
      model: user.model ?? null,
      allowedModels: Array.isArray(user.allowedModels) ? user.allowedModels : [],
      createdAt: new Date().toISOString(),
      active: true,
    };
    db.prepare(
      'INSERT INTO users (id, name, api_key, model, allowed_models, created_at, active) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      newUser.id,
      newUser.name,
      newUser.key,
      newUser.model,
      JSON.stringify(newUser.allowedModels),
      newUser.createdAt,
      1
    );
    return newUser;
  }

  function updateUser(id: string, patch: Partial<GatewayUser>): GatewayUser | null {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    if (!row) return null;
    const updated = { ...rowToUser(row), ...patch };
    db.prepare(
      'UPDATE users SET name=?, model=?, allowed_models=?, active=?, api_key=? WHERE id=?'
    ).run(
      updated.name,
      updated.model,
      JSON.stringify(updated.allowedModels),
      updated.active ? 1 : 0,
      updated.key,
      id
    );
    return updated;
  }

  function deleteUser(id: string): boolean {
    return db.prepare('DELETE FROM users WHERE id = ?').run(id).changes > 0;
  }

  // ── Export / Import ────────────────────────────────────────────────────────

  function exportAll(): ExportPayload & {
    providers: { id: string; providerType: string; key?: string; url?: string }[];
  } {
    const allModels = (
      db.prepare('SELECT * FROM models ORDER BY created_at ASC').all() as ModelRow[]
    ).map(rowToModel);
    const allUsers = (
      db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as UserRow[]
    ).map(rowToUser);
    return {
      _gateway_export: true,
      _module: 'all',
      _version: '2.0',
      _exported_at: new Date().toISOString(),
      models: allModels,
      users: allUsers,
      providers: resolvedProviders
        .list()
        .map((p) => ({ id: p.id, providerType: p.providerType, key: p.key, url: p.url })),
    };
  }

  function importAll(
    payload: ExportPayload & { providers?: unknown[] },
    mode: 'merge' | 'replace' = 'merge'
  ): ImportReport {
    if (!payload?._gateway_export) {
      throw new Error('Arquivo inválido: não é uma exportação do LLM Switch.');
    }
    return _importModules(payload, ['models', 'users'], mode);
  }

  function exportModule(module: 'models' | 'users'): ExportPayload {
    const allModels =
      module === 'models'
        ? (db.prepare('SELECT * FROM models ORDER BY created_at ASC').all() as ModelRow[]).map(rowToModel)
        : undefined;
    const allUsers =
      module === 'users'
        ? (db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as UserRow[]).map(rowToUser)
        : undefined;
    return {
      _gateway_export: true,
      _module: module,
      _version: '2.0',
      _exported_at: new Date().toISOString(),
      ...(allModels && { models: allModels }),
      ...(allUsers && { users: allUsers }),
    };
  }

  function importModule(
    payload: ExportPayload,
    module: 'models' | 'users',
    mode: 'merge' | 'replace' = 'merge'
  ): ImportReport {
    if (!payload?._gateway_export) {
      throw new Error('Arquivo inválido: não é uma exportação do LLM Switch.');
    }
    if (!payload[module]) {
      throw new Error(`Arquivo não contém dados do módulo "${module}".`);
    }
    return _importModules(payload, [module], mode);
  }

  function _importModules(
    payload: ExportPayload,
    modules: ('models' | 'users')[],
    mode: 'merge' | 'replace'
  ): ImportReport {
    const report: ImportReport = { added: {}, skipped: {} };

    for (const mod of modules) {
      report.added[mod] = 0;
      report.skipped[mod] = 0;

      if (mod === 'models') {
        const items = payload.models ?? [];
        if (mode === 'replace') db.prepare('DELETE FROM models').run();
        for (const m of items) {
          const id = m.id || `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          if (mode === 'merge' && db.prepare('SELECT id FROM models WHERE value = ?').get(m.value)) {
            report.skipped[mod]++;
            continue;
          }
          db.prepare(
            'INSERT OR IGNORE INTO models (id, value, label, active, input_cost_per1m, output_cost_per1m, rate_limit_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).run(
            id,
            m.value,
            m.label,
            m.active ? 1 : 0,
            m.inputCostPer1M ?? null,
            m.outputCostPer1M ?? null,
            m.rateLimit ? JSON.stringify(m.rateLimit) : null
          );
          report.added[mod]++;
        }
      } else {
        const items = payload.users ?? [];
        if (mode === 'replace') db.prepare('DELETE FROM users').run();
        for (const u of items) {
          const id = u.id || `u_${Date.now()}`;
          if (
            mode === 'merge' &&
            db.prepare('SELECT id FROM users WHERE name = ? OR api_key = ?').get(u.name, u.key)
          ) {
            report.skipped[mod]++;
            continue;
          }
          db.prepare(
            'INSERT OR IGNORE INTO users (id, name, api_key, model, allowed_models, created_at, active) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).run(
            id,
            u.name,
            u.key,
            u.model ?? null,
            JSON.stringify(u.allowedModels ?? []),
            u.createdAt,
            u.active ? 1 : 0
          );
          report.added[mod]++;
        }
      }
    }

    return report;
  }

  function close(): void {
    db.close();
  }

  return {
    getModels,
    addModel,
    updateModel,
    syncModels,
    pruneUnconfiguredModels,
    deleteModel,
    deleteProviderModels,
    getUsers,
    getUserByKey,
    addUser,
    updateUser,
    deleteUser,
    exportAll,
    importAll,
    exportModule,
    importModule,
    close,
  };
}

export type StoreService = ReturnType<typeof createStore>;
export const store = createStore();
export { createStore };
