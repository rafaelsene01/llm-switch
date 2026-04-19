import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { DEFAULT_BLOCKLIST } from "./defaults/blocklist.js";
import { DEFAULT_MODELS } from "./defaults/models.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, "../../data");
const DATA_FILE = join(DATA_DIR, "config.json");

// ─── READ / WRITE ─────────────────────────────────────────────────────────────

function load() {
  if (!existsSync(DATA_FILE)) {
    const fresh = { blocklist: DEFAULT_BLOCKLIST, models: DEFAULT_MODELS, users: [] };
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(fresh, null, 2));
    return structuredClone(fresh);
  }
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { blocklist: DEFAULT_BLOCKLIST, models: DEFAULT_MODELS, users: [] };
  }
}

function save(data) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ─── BLOCKLIST ────────────────────────────────────────────────────────────────

const VALID_MODES = ["disabled", "redact", "block"];

function normalizeMode(entry) {
  if (VALID_MODES.includes(entry.mode)) return entry.mode;
  // backward compat: converte campo legado `active` para mode
  if (entry.active === false) return "disabled";
  return "redact";
}

export function getBlocklist() {
  return load().blocklist.map((e) => ({ ...e, mode: normalizeMode(e) }));
}

export function addBlocklistEntry(entry) {
  const data = load();
  const newEntry = {
    id: `bl_${Date.now()}`,
    label: entry.label || entry.value.slice(0, 40),
    value: entry.value,
    type: entry.type || "word",
    replacement: entry.replacement || "[REMOVIDO]",
    mode: VALID_MODES.includes(entry.mode) ? entry.mode : "redact",
    builtin: false,
    category: entry.category || "custom",
  };
  data.blocklist.push(newEntry);
  save(data);
  return { ...newEntry, mode: normalizeMode(newEntry) };
}

export function updateBlocklistEntry(id, patch) {
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

export function deleteBlocklistEntry(id) {
  const data = load();
  const entry = data.blocklist.find((e) => e.id === id);
  if (!entry) return false;
  data.blocklist = data.blocklist.filter((e) => e.id !== id);
  save(data);
  return true;
}

// ─── MODELS ──────────────────────────────────────────────────────────────────

export function getModels() {
  return load().models;
}

export function addModel(model) {
  const data = load();
  if (data.models.find((m) => m.value === model.value)) {
    throw new Error(`Modelo "${model.value}" já existe.`);
  }
  const newModel = {
    id: `m_${Date.now()}`,
    value: model.value,
    label: model.label || model.value,
    active: true,
  };
  data.models.push(newModel);
  save(data);
  return newModel;
}

export function deleteModel(id) {
  const data = load();
  const modelEntry = data.models.find((m) => m.id === id);
  if (!modelEntry) return false;
  const usersWithModel = data.users.filter((u) => u.model === modelEntry.value);
  if (usersWithModel.length > 0) {
    throw new Error(
      `Modelo em uso pelos usuários: ${usersWithModel.map((u) => u.name).join(", ")}`
    );
  }
  data.models = data.models.filter((m) => m.id !== id);
  save(data);
  return true;
}

// ─── USERS ───────────────────────────────────────────────────────────────────

export function getUsers() {
  return load().users.map(({ key, ...rest }) => ({
    ...rest,
    keyPreview: key ? key.slice(0, 8) + "..." : "???",
  }));
}

export function getUserByKey(key) {
  return load().users.find((u) => u.key === key) || null;
}

export function addUser(user) {
  const data = load();
  if (data.users.find((u) => u.name === user.name)) {
    throw new Error(`Usuário "${user.name}" já existe.`);
  }
  if (data.users.find((u) => u.key === user.key)) {
    throw new Error(`Essa API key já está em uso.`);
  }
  const newUser = {
    id: `u_${Date.now()}`,
    name: user.name,
    key: user.key,
    model: user.model || null,
    allowedModels: Array.isArray(user.allowedModels) ? user.allowedModels : [],
    createdAt: new Date().toISOString(),
    active: true,
  };
  data.users.push(newUser);
  save(data);
  return newUser;
}

export function updateUser(id, patch) {
  const data = load();
  const idx = data.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const { key, ...safePatch } = patch;
  data.users[idx] = { ...data.users[idx], ...safePatch };
  save(data);
  return data.users[idx];
}

export function deleteUser(id) {
  const data = load();
  const before = data.users.length;
  data.users = data.users.filter((u) => u.id !== id);
  if (data.users.length === before) return false;
  save(data);
  return true;
}

// ─── EXPORT / IMPORT COMPLETO ────────────────────────────────────────────────

export function exportAll() {
  const data = load();
  return {
    _gateway_export: true,
    _module: "all",
    _version: "1.0",
    _exported_at: new Date().toISOString(),
    blocklist: data.blocklist,
    models: data.models,
    users: data.users,
  };
}

export function importAll(payload, mode = "merge") {
  if (!payload?._gateway_export) {
    throw new Error("Arquivo inválido: não é uma exportação do LLM Gateway.");
  }
  return _importModules(payload, ["blocklist", "models", "users"], mode);
}

// ─── EXPORT / IMPORT POR MÓDULO ──────────────────────────────────────────────

export function exportModule(module) {
  const data = load();
  const allowed = ["blocklist", "models", "users"];
  if (!allowed.includes(module)) throw new Error(`Módulo "${module}" inválido.`);
  return {
    _gateway_export: true,
    _module: module,
    _version: "1.0",
    _exported_at: new Date().toISOString(),
    [module]: data[module],
  };
}

export function importModule(payload, module, mode = "merge") {
  if (!payload?._gateway_export) {
    throw new Error("Arquivo inválido: não é uma exportação do LLM Gateway.");
  }
  if (!payload[module]) {
    throw new Error(`Arquivo não contém dados do módulo "${module}".`);
  }
  return _importModules(payload, [module], mode);
}

// ─── HELPER INTERNO ──────────────────────────────────────────────────────────

function _importModules(payload, modules, mode) {
  const current = load();
  const report = { added: {}, skipped: {} };

  for (const mod of modules) {
    report.added[mod]   = 0;
    report.skipped[mod] = 0;
    const items = payload[mod] || [];

    if (mode === "replace") {
      current[mod] = items.map(e => ({ ...e, id: e.id || `${mod}_${Date.now()}_${Math.random().toString(36).slice(2)}` }));
      report.added[mod] = current[mod].length;
    } else {
      // merge — chave de deduplicação por módulo
      const keyFn = mod === "users"
        ? (x) => x.name + "|" + x.key
        : (x) => x.value;

      for (const item of items) {
        const exists = current[mod].find(e => keyFn(e) === keyFn(item));
        if (exists) {
          report.skipped[mod]++;
        } else {
          current[mod].push({ ...item, id: item.id || `${mod}_${Date.now()}_${Math.random().toString(36).slice(2)}` });
          report.added[mod]++;
        }
      }
    }
  }

  save(current);
  return report;
}
