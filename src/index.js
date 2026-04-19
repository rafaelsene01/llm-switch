import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { authMiddleware } from "./middleware/auth.js";
import { rateLimitMiddleware } from "./middleware/rateLimit.js";
import chatRoute from "./routes/chat.js";
import modelsRoute from "./routes/models.js";
import adminRoute from "./routes/admin.js";
import logger from "./utils/logger.js";
import { listRules } from "./sanitizer/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

mkdirSync(join(__dirname, "../logs"), { recursive: true });
mkdirSync(join(__dirname, "../data"), { recursive: true });

// ─── APP ──────────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.use(morgan("dev"));

// ── Arquivos estáticos (UI web) ───────────────────────────────────────────────
app.use(express.static(join(__dirname, "../public")));

// ── Health check (sem auth) ───────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", gateway: "llm-gateway", timestamp: new Date().toISOString() });
});

// ── Admin API (autenticação própria no router) ────────────────────────────────
app.use("/admin", adminRoute);

// ── API principal (autenticação por key de usuário) ───────────────────────────
app.use(authMiddleware);
app.use(rateLimitMiddleware);

app.use("/v1/chat/completions", chatRoute);
app.use("/v1/models", modelsRoute);

app.get("/v1/gateway/rules", (req, res) => {
  res.json({ rules: listRules() });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: { message: "Rota não encontrada.", type: "not_found" } });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error("unhandled_error", { message: err.message, stack: err.stack });
  res.status(500).json({ error: { message: "Erro interno do gateway.", type: "internal_error" } });
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 LLM Gateway rodando em http://localhost:${PORT}`);
  logger.info(`   UI Admin:  http://localhost:${PORT}`);
  logger.info(`   API:       http://localhost:${PORT}/v1/chat/completions`);
});
