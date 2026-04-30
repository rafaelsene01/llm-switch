import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { DEFAULT_BLOCKLIST } from '../data/defaults/blocklist';
import { DEFAULT_MODELS } from '../data/defaults/models';
import type {
  BlocklistEntry,
  BlocklistMode,
  GatewayModel,
  GatewayProvider,
  GatewayUser,
  UserPublic,
} from '../types';
import { DEFAULT_SANITIZATION_ROLES } from '../types';
import type { ProviderModelInfo } from './providers.service';

const VALID_MODES: BlocklistMode[] = ['disabled', 'redact', 'block'];

const DEFAULT_PROVIDERS: GatewayProvider[] = [
  { id: 'openai',     name: 'OpenAI',      type: 'cloud', configured: false, enabled: false },
  { id: 'anthropic',  name: 'Anthropic',   type: 'cloud', configured: false, enabled: false },
  { id: 'google',     name: 'Google',      type: 'cloud', configured: false, enabled: false },
  { id: 'mistral',    name: 'Mistral',     type: 'cloud', configured: false, enabled: false },
  { id: 'openrouter', name: 'OpenRouter',  type: 'cloud', configured: false, enabled: false },
  { id: 'ollama',     name: 'Ollama',      type: 'local', url: 'http://localhost:11434', configured: false, enabled: false },
  { id: 'lmstudio',   name: 'LM Studio',   type: 'local', url: 'http://localhost:1234',  configured: false, enabled: false },
];

interface StoreData {
  blocklist: BlocklistEntry[];
  models: GatewayModel[];
  users: GatewayUser[];
  providers: GatewayProvider[];
}

interface ProviderExportEntry {
  id: string;
  key?: string;
  url?: string;
}

interface ExportPayload {
  _gateway_export: boolean;
  _module: string;
  _version: string;
  _exported_at: string;
  blocklist?: BlocklistEntry[];
  models?: GatewayModel[];
  users?: GatewayUser[];
  providers?: ProviderExportEntry[];
}

interface ImportReport {
  added: Record<string, number>;
  skipped: Record<string, number>;
}

function createStore(dataFile?: string) {
  const resolvedFile = dataFile ?? path.resolve('data/config.json');

  function load(): StoreData {
    if (!existsSync(resolvedFile)) {
      const fresh: StoreData = {
        blocklist: DEFAULT_BLOCKLIST,
        models: DEFAULT_MODELS,
        users: [],
        providers: structuredClone(DEFAULT_PROVIDERS),
      };
      mkdirSync(path.dirname(resolvedFile), { recursive: true });
      writeFileSync(resolvedFile, JSON.stringify(fresh, null, 2));
      return structuredClone(fresh);
    }
    try {
      const data = JSON.parse(readFileSync(resolvedFile, 'utf8')) as StoreData;
      if (!data.providers) {
        data.providers = structuredClone(DEFAULT_PROVIDERS);
        save(data);
      }
      return data;
    } catch {
      return { blocklist: DEFAULT_BLOCKLIST, models: DEFAULT_MODELS, users: [], providers: structuredClone(DEFAULT_PROVIDERS) };
    }
  }

  function save(data: StoreData): void {
    mkdirSync(path.dirname(resolvedFile), { recursive: true });
    writeFileSync(resolvedFile, JSON.stringify(data, null, 2));
  }

  function normalizeMode(entry: BlocklistEntry): BlocklistMode {
    if (VALID_MODES.includes(entry.mode)) return entry.mode;
    return 'redact';
  }

  // ── Blocklist ──────────────────────────────────────────────────────────────

  function getBlocklist(): BlocklistEntry[] {
    return load().blocklist.map((e) => ({ ...e, mode: normalizeMode(e) }));
  }

  function addBlocklistEntry(entry: Partial<BlocklistEntry>): BlocklistEntry {
    const data = load();
    const newEntry: BlocklistEntry = {
      id: `bl_${Date.now()}`,
      label: entry.label ?? (entry.value ?? '').slice(0, 40),
      value: entry.value ?? '',
      type: entry.type ?? 'word',
      replacement: entry.replacement ?? '[REMOVIDO]',
      mode: VALID_MODES.includes(entry.mode as BlocklistMode)
        ? (entry.mode as BlocklistMode)
        : 'redact',
      builtin: false,
      category: entry.category ?? 'custom',
    };
    data.blocklist.push(newEntry);
    save(data);
    return { ...newEntry, mode: normalizeMode(newEntry) };
  }

  function updateBlocklistEntry(
    id: string,
    patch: Partial<BlocklistEntry>
  ): BlocklistEntry | null {
    const data = load();
    const idx = data.blocklist.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const safePatch = { ...patch };
    if (safePatch.mode !== undefined && !VALID_MODES.includes(safePatch.mode)) {
      delete safePatch.mode;
    }
    data.blocklist[idx] = { ...data.blocklist[idx], ...safePatch };
    save(data);
    return { ...data.blocklist[idx], mode: normalizeMode(data.blocklist[idx]) };
  }

  function deleteBlocklistEntry(id: string): boolean {
    const data = load();
    const entry = data.blocklist.find((e) => e.id === id);
    if (!entry) return false;
    data.blocklist = data.blocklist.filter((e) => e.id !== id);
    save(data);
    return true;
  }

  // ── Models ─────────────────────────────────────────────────────────────────

  function getModels(): GatewayModel[] {
    const data = load();
    const configuredIds = new Set(
      data.providers.filter((p) => p.configured).map((p) => p.id)
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

  // ── Users ──────────────────────────────────────────────────────────────────

  function getUsers(): UserPublic[] {
    return load().users.map(({ key, ...rest }) => ({
      ...rest,
      keyPreview: key ? key.slice(0, 8) + '...' : '???',
      sanitizationRoles: rest.sanitizationRoles ?? DEFAULT_SANITIZATION_ROLES,
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
      sanitizationRoles: user.sanitizationRoles ?? DEFAULT_SANITIZATION_ROLES,
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

  // ── Providers ──────────────────────────────────────────────────────────────

  function getProviders(): GatewayProvider[] {
    return load().providers.map((p) => ({
      ...p,
      // backward compat: old entries without enabled field default to configured state
      enabled: p.enabled !== undefined ? p.enabled : p.configured,
    }));
  }

  function updateProvider(id: string, patch: Partial<Pick<GatewayProvider, 'key' | 'url' | 'enabled'>>): GatewayProvider | null {
    const data = load();
    const idx = data.providers.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const current = data.providers[idx];
    const updated = { ...current, ...patch };
    const wasConfigured = current.configured;
    updated.configured = updated.type === 'cloud'
      ? Boolean(updated.key)
      : Boolean(updated.url);

    const explicitEnabled = 'enabled' in patch ? patch.enabled : undefined;
    if (explicitEnabled !== undefined) {
      // Respect explicit toggle, but can only be enabled if configured
      updated.enabled = explicitEnabled && updated.configured;
    } else if (!wasConfigured && updated.configured) {
      // Just became configured → auto-enable
      updated.enabled = true;
    } else {
      // Preserve current enabled, defaulting to configured state for old entries
      updated.enabled = current.enabled !== undefined ? current.enabled : current.configured;
    }

    data.providers[idx] = updated;
    save(data);
    return updated;
  }

  function clearProviderKey(id: string): boolean {
    const data = load();
    const idx = data.providers.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    const { key: _key, ...rest } = data.providers[idx];
    data.providers[idx] = {
      ...rest,
      url: data.providers[idx].type === 'local'
        ? DEFAULT_PROVIDERS.find((p) => p.id === id)?.url
        : undefined,
      configured: false,
      enabled: false,
    };
    save(data);
    return true;
  }

  // ── Export / Import ────────────────────────────────────────────────────────

  function exportAll(): ExportPayload {
    const data = load();
    return {
      _gateway_export: true,
      _module: 'all',
      _version: '1.0',
      _exported_at: new Date().toISOString(),
      blocklist: data.blocklist,
      models: data.models,
      users: data.users,
      providers: data.providers.map((p) => ({ id: p.id, key: p.key, url: p.url })),
    };
  }

  function importAll(payload: ExportPayload, mode: 'merge' | 'replace' = 'merge'): ImportReport {
    if (!payload?._gateway_export) {
      throw new Error('Arquivo inválido: não é uma exportação do LLM Gateway.');
    }
    const report = _importModules(payload, ['blocklist', 'models', 'users'], mode);
    if (payload.providers) {
      const provReport = _importProviders(payload.providers);
      report.added['providers'] = provReport.added;
      report.skipped['providers'] = provReport.skipped;
    }
    return report;
  }

  function exportModule(module: 'blocklist' | 'models' | 'users' | 'providers'): ExportPayload {
    const data = load();
    if (module === 'providers') {
      return {
        _gateway_export: true,
        _module: 'providers',
        _version: '1.0',
        _exported_at: new Date().toISOString(),
        providers: data.providers.map((p) => ({ id: p.id, key: p.key, url: p.url })),
      };
    }
    return {
      _gateway_export: true,
      _module: module,
      _version: '1.0',
      _exported_at: new Date().toISOString(),
      [module]: data[module],
    };
  }

  function importModule(
    payload: ExportPayload,
    module: 'blocklist' | 'models' | 'users' | 'providers',
    mode: 'merge' | 'replace' = 'merge'
  ): ImportReport {
    if (!payload?._gateway_export) {
      throw new Error('Arquivo inválido: não é uma exportação do LLM Gateway.');
    }
    if (!payload[module]) {
      throw new Error(`Arquivo não contém dados do módulo "${module}".`);
    }
    if (module === 'providers') {
      const provReport = _importProviders(payload.providers ?? []);
      return { added: { providers: provReport.added }, skipped: { providers: provReport.skipped } };
    }
    return _importModules(payload, [module], mode);
  }

  function _importProviders(entries: ProviderExportEntry[]): { added: number; skipped: number } {
    const data = load();
    let updated = 0;
    let skipped = 0;
    for (const entry of entries) {
      const idx = data.providers.findIndex((p) => p.id === entry.id);
      if (idx === -1) { skipped++; continue; }
      const p = data.providers[idx];
      const patch: Partial<GatewayProvider> = {};
      if (entry.url !== undefined) patch.url = entry.url;
      if (entry.key && entry.key !== '***') patch.key = entry.key;
      data.providers[idx] = { ...p, ...patch };
      data.providers[idx].configured =
        p.type === 'cloud' ? Boolean(data.providers[idx].key) : Boolean(data.providers[idx].url);
      updated++;
    }
    save(data);
    return { added: updated, skipped };
  }

  function _importModules(
    payload: ExportPayload,
    modules: ('blocklist' | 'models' | 'users')[],
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
            : (x: GatewayModel | BlocklistEntry) => x.value;

        for (const item of items as (GatewayUser | GatewayModel | BlocklistEntry)[]) {
          const exists = (current[mod] as (GatewayUser | GatewayModel | BlocklistEntry)[]).find(
            (e) => keyFn(e as GatewayUser & GatewayModel & BlocklistEntry) === keyFn(item as GatewayUser & GatewayModel & BlocklistEntry)
          );
          if (exists) {
            report.skipped[mod]++;
          } else {
            (current[mod] as (GatewayUser | GatewayModel | BlocklistEntry)[]).push({
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
    getBlocklist,
    addBlocklistEntry,
    updateBlocklistEntry,
    deleteBlocklistEntry,
    getModels,
    addModel,
    updateModel,
    syncModels,
    pruneUnconfiguredModels,
    deleteModel,
    getUsers,
    getUserByKey,
    addUser,
    updateUser,
    deleteUser,
    getProviders,
    updateProvider,
    clearProviderKey,
    exportAll,
    importAll,
    exportModule,
    importModule,
  };
}

export type StoreService = ReturnType<typeof createStore>;

export const store = createStore();
export { createStore };
