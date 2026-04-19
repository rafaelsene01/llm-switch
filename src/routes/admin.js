import { Router } from "express";
import { randomBytes } from "crypto";
import {
  getBlocklist, addBlocklistEntry, updateBlocklistEntry, deleteBlocklistEntry,
  getModels, addModel, deleteModel,
  getUsers, addUser, updateUser, deleteUser,
  exportAll, importAll,
  exportModule, importModule,
} from "../data/store.js";

const router = Router();

// ─── AUTH ADMIN ───────────────────────────────────────────────────────────────
router.use((req, res, next) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return next();
  const token =
    (req.headers["authorization"] || "").replace("Bearer ", "").trim() ||
    req.headers["x-api-key"] || "";
  if (token !== adminKey) {
    return res.status(403).json({ error: { message: "Acesso admin negado.", type: "forbidden" } });
  }
  next();
});

// ─── HELPER ───────────────────────────────────────────────────────────────────
function wrap(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (err) { res.status(400).json({ error: { message: err.message, type: "bad_request" } }); }
  };
}

function downloadJson(res, data, filename) {
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/json");
  res.json(data);
}

// ─── BLOCKLIST ────────────────────────────────────────────────────────────────

router.get("/blocklist", wrap(async (req, res) => {
  res.json(getBlocklist());
}));

router.post("/blocklist", wrap(async (req, res) => {
  const { value, type, label, replacement, category } = req.body;
  if (!value) return res.status(400).json({ error: { message: "Campo 'value' obrigatório." } });
  if (type === "regex") {
    try { new RegExp(value); } catch {
      return res.status(400).json({ error: { message: "Regex inválida." } });
    }
  }
  res.status(201).json(addBlocklistEntry({ value, type, label, replacement, category }));
}));

router.patch("/blocklist/:id", wrap(async (req, res) => {
  const entry = updateBlocklistEntry(req.params.id, req.body);
  if (!entry) return res.status(404).json({ error: { message: "Entrada não encontrada." } });
  res.json(entry);
}));

router.delete("/blocklist/:id", wrap(async (req, res) => {
  if (!deleteBlocklistEntry(req.params.id))
    return res.status(404).json({ error: { message: "Entrada não encontrada." } });
  res.json({ success: true });
}));

// ─── MODELS ──────────────────────────────────────────────────────────────────

router.get("/models", wrap(async (req, res) => {
  res.json(getModels());
}));

router.post("/models", wrap(async (req, res) => {
  const { value, label } = req.body;
  if (!value) return res.status(400).json({ error: { message: "Campo 'value' obrigatório (ex: openai:gpt-4o)." } });
  res.status(201).json(addModel({ value, label }));
}));

router.delete("/models/:id", wrap(async (req, res) => {
  if (!deleteModel(req.params.id))
    return res.status(404).json({ error: { message: "Modelo não encontrado." } });
  res.json({ success: true });
}));

// ─── USERS ───────────────────────────────────────────────────────────────────

router.get("/users", wrap(async (req, res) => {
  res.json(getUsers());
}));

router.get("/users/generate-key", (req, res) => {
  res.json({ key: "gw_" + randomBytes(20).toString("hex") });
});

router.post("/users", wrap(async (req, res) => {
  const { name, key, model } = req.body;
  if (!name) return res.status(400).json({ error: { message: "Campo 'name' obrigatório." } });
  if (!key)  return res.status(400).json({ error: { message: "Campo 'key' obrigatório." } });
  res.status(201).json(addUser({ name, key, model }));
}));

router.patch("/users/:id", wrap(async (req, res) => {
  const user = updateUser(req.params.id, req.body);
  if (!user) return res.status(404).json({ error: { message: "Usuário não encontrado." } });
  res.json(user);
}));

router.delete("/users/:id", wrap(async (req, res) => {
  if (!deleteUser(req.params.id))
    return res.status(404).json({ error: { message: "Usuário não encontrado." } });
  res.json({ success: true });
}));

// ─── EXPORT / IMPORT COMPLETO ────────────────────────────────────────────────

router.get("/export", wrap(async (req, res) => {
  const date = new Date().toISOString().slice(0, 10);
  downloadJson(res, exportAll(), `gateway-config-${date}.json`);
}));

router.post("/import", wrap(async (req, res) => {
  const { payload, mode = "merge" } = req.body;
  if (!payload) return res.status(400).json({ error: { message: "Campo 'payload' obrigatório." } });
  if (!["merge", "replace"].includes(mode))
    return res.status(400).json({ error: { message: "mode deve ser 'merge' ou 'replace'." } });
  res.json({ success: true, mode, report: importAll(payload, mode) });
}));

// ─── EXPORT / IMPORT POR MÓDULO ──────────────────────────────────────────────
// Módulos: blocklist | models | users
// GET  /admin/export/:module  → baixa JSON do módulo
// POST /admin/import/:module  → importa JSON do módulo

const MODULES = ["blocklist", "models", "users"];

router.get("/export/:module", wrap(async (req, res) => {
  const { module } = req.params;
  if (!MODULES.includes(module))
    return res.status(400).json({ error: { message: `Módulo inválido. Use: ${MODULES.join(", ")}` } });
  const date = new Date().toISOString().slice(0, 10);
  downloadJson(res, exportModule(module), `gateway-${module}-${date}.json`);
}));

router.post("/import/:module", wrap(async (req, res) => {
  const { module } = req.params;
  if (!MODULES.includes(module))
    return res.status(400).json({ error: { message: `Módulo inválido. Use: ${MODULES.join(", ")}` } });
  const { payload, mode = "merge" } = req.body;
  if (!payload) return res.status(400).json({ error: { message: "Campo 'payload' obrigatório." } });
  if (!["merge", "replace"].includes(mode))
    return res.status(400).json({ error: { message: "mode deve ser 'merge' ou 'replace'." } });
  res.json({ success: true, module, mode, report: importModule(payload, module, mode) });
}));

export default router;
