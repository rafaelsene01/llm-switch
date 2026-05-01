import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { DEFAULT_MODELS } from '../data/defaults/models';
import type {
  GatewayModel,
  GatewayUser,
  UserPublic,
} from '../types';
import type { ProviderModelInfo } from './providers.service';
import { providersDb } from './providers-db.service';

interface StoreData {
  models: GatewayModel[];
  users: GatewayUser[];
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

function createStore(dataFile?: string) {
  const resolvedFile = dataFile ?? path.resolve('data/config.json');

  function load(): StoreData {
    if (!existsSync(resolvedFile)) {
      const fresh: StoreData = { models: DEFAULT_MODELS, users: [] };
      mkdirSync(path.dirname(resolvedFile), { recursive: true });
      writeFileSync(resolvedFile, JSON.stringify(fresh, null, 2));
      return structuredClone(fresh);
    }
    try {
      const raw = JSON.parse(readFileSync(resolvedFile, 'utf8')) as StoreData & { providers?: unknown };
      // Strip providers from JSON if still present (migrated to SQLite)
      const data: StoreData = { models: raw.models ?? DEFAULT_MODELS, users: raw.users ?? [] };
      return data;
    } catch {
      return { models: DEFAULT_MODELS, users: [] };
    }
  }

  function save(data: StoreData): void {
    mkdirSync(path.dirname(resolvedFile), { recursive: true });
    writeFileSync(resolvedFile, JSON.stringify(data, null, 2));
  }

  // ── Models ─────────────────────────────────────────────────────────────────

  function getModels(): GatewayModel[] {
    const data = load();
    const configuredIds = new Set(
      providersDb.list().filter((p) => p.configured).map((p) => p.id)
    );
    return data.models.filter((m) => configuredIds.has(m.value.split(':')[0]));
  }

  function addModel(model: Pick<GatewayModel, 'value' | 'label'>): GatewayModel {
    const data = load();
    if (data.models.find((m) => m.value === model.value)) {
      throw new Error(`Modelo "${model.value}" já existe.`);
    }
    const newModel: GatewayModel = {
      id: `m_${Date.now()}`,
      value: model.value,
      label: model.label || model.value,
      active: true,
    };
    data.models.push(newModel);
    save(data);
    return newModel;
  }

  function syncModels(
    providerId: string,
    newModels: ProviderModelInfo[]
  ): { added: number; removed: number; models: GatewayModel[] } {
    const data = load();
    const prefix = `${providerId}:`;
    const currentForProvider = data.models.filter((m) => m.value.startsWith(prefix));
    const currentOther = data.models.filter((m) => !m.value.startsWith(prefix));

    const newValueSet = new Set(newModels.map((m) => `${prefix}${m.id}`));
    const currentValueMap = new Map(currentForProvider.map((m) => [m.value, m]));

    const kept: GatewayModel[] = [];
    let added = 0;

    for (const m of newModels) {
      const value = `${prefix}${m.id}`;
      const existing = currentValueMap.get(value);
      if (existing) {
        kept.push(existing);
      } else {
        kept.push({ id: `m_${Date.now()}_${Math.random().toString(36).slice(2)}`, value, label: m.name, active: true });
        added++;
      }
    }

    const removed = currentForProvider.filter((m) => !newValueSet.has(m.value)).length;
    data.models = [...currentOther, ...kept];
    save(data);
    return { added, removed, models: data.models };
  }

  function updateModel(id: string, patch: Partial<Pick<GatewayModel, 'active' | 'label' | 'inputCostPer1M' | 'outputCostPer1M'>>): GatewayModel | null {
    const data = load();
    const idx = data.models.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    data.models[idx] = { ...data.models[idx], ...patch };
    save(data);
    return data.models[idx];
  }

  function pruneUnconfiguredModels(configuredProviderIds: string[]): { removed: number } {
    const data = load();
    const before = data.models.length;
    data.models = data.models.filter((m) => {
      const prefix = m.value.split(':')[0];
      return configuredProviderIds.includes(prefix);
    });
    const removed = before - data.models.length;
    if (removed > 0) save(data);
    return { removed };
  }

  function deleteModel(id: string): boolean {
    const data = load();
    const modelEntry = data.models.find((m) => m.id === id);
    if (!modelEntry) return false;
    const usersWithModel = data.users.filter((u) => u.model === modelEntry.value);
    if (usersWithModel.length > 0) {
      throw new Error(
        `Modelo em uso pelos usuários: ${usersWithModel.map((u) => u.name).join(', ')}`
      );
    }
    data.models = data.models.filter((m) => m.id !== id);
    save(data);
    return true;
  }

  // Remove all models belonging to a provider instance
  function deleteProviderModels(providerId: string): number {
    const data = load();
    const prefix = `${providerId}:`;
    const before = data.models.length;
    data.models = data.models.filter((m) => !m.value.startsWith(prefix));
    const removed = before - data.models.length;
    if (removed > 0) save(data);
    return removed;
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  function getUsers(): UserPublic[] {
    return load().users.map(({ key, ...rest }) => ({
      ...rest,
      keyPreview: key ? key.slice(0, 8) + '...' : '???',
    }));
  }

  function getUserByKey(key: string): GatewayUser | null {
    return load().users.find((u) => u.key === key) ?? null;
  }

  function addUser(user: Omit<GatewayUser, 'id' | 'createdAt' | 'active'>): GatewayUser {
    const data = load();
    if (data.users.find((u) => u.name === user.name)) {
      throw new Error(`Usuário "${user.name}" já existe.`);
    }
    if (data.users.find((u) => u.key === user.key)) {
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
    data.users.push(newUser);
    save(data);
    return newUser;
  }

  function updateUser(id: string, patch: Partial<GatewayUser>): GatewayUser | null {
    const data = load();
    const idx = data.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    const { key: _key, ...safePatch } = patch;
    data.users[idx] = { ...data.users[idx], ...safePatch };
    save(data);
    return data.users[idx];
  }

  function deleteUser(id: string): boolean {
    const data = load();
    const before = data.users.length;
    data.users = data.users.filter((u) => u.id !== id);
    if (data.users.length === before) return false;
    save(data);
    return true;
  }

  // ── Export / Import ────────────────────────────────────────────────────────

  function exportAll(): ExportPayload & { providers: { id: string; providerType: string; key?: string; url?: string }[] } {
    const data = load();
    return {
      _gateway_export: true,
      _module: 'all',
      _version: '2.0',
      _exported_at: new Date().toISOString(),
      models: data.models,
      users: data.users,
      providers: providersDb.list().map((p) => ({ id: p.id, providerType: p.providerType, key: p.key, url: p.url })),
    };
  }

  function importAll(payload: ExportPayload & { providers?: unknown[] }, mode: 'merge' | 'replace' = 'merge'): ImportReport {
    if (!payload?._gateway_export) {
      throw new Error('Arquivo inválido: não é uma exportação do LLM Switch.');
    }
    return _importModules(payload, ['models', 'users'], mode);
  }

  function exportModule(module: 'models' | 'users'): ExportPayload {
    const data = load();
    return {
      _gateway_export: true,
      _module: module,
      _version: '2.0',
      _exported_at: new Date().toISOString(),
      [module]: data[module],
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
    const current = load();
    const report: ImportReport = { added: {}, skipped: {} };

    for (const mod of modules) {
      report.added[mod] = 0;
      report.skipped[mod] = 0;
      const items = (payload[mod] as StoreData[typeof mod]) ?? [];

      if (mode === 'replace') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (current as any)[mod] = items.map((e: any) => ({
          ...e,
          id: e.id || `${mod}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        }));
        report.added[mod] = current[mod].length;
      } else {
        const keyFn =
          mod === 'users'
            ? (x: GatewayUser) => x.name + '|' + x.key
            : (x: GatewayModel) => x.value;

        for (const item of items as (GatewayUser | GatewayModel)[]) {
          const exists = (current[mod] as (GatewayUser | GatewayModel)[]).find(
            (e) => keyFn(e as GatewayUser & GatewayModel) === keyFn(item as GatewayUser & GatewayModel)
          );
          if (exists) {
            report.skipped[mod]++;
          } else {
            (current[mod] as (GatewayUser | GatewayModel)[]).push({
              ...item,
              id:
                (item as { id?: string }).id ||
                `${mod}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            });
            report.added[mod]++;
          }
        }
      }
    }

    save(current);
    return report;
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
  };
}

export type StoreService = ReturnType<typeof createStore>;

export const store = createStore();
export { createStore };
