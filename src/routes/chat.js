import { Router } from "express";
import { generateText } from "ai";
import { v4 as uuidv4 } from "uuid";
import { resolveModel } from "../providers.js";
import { sanitizeMessages, sanitizeText } from "../sanitizer/index.js";
import { logRequest } from "../utils/logger.js";

const router = Router();

// ─── POST /v1/chat/completions ────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();

  const {
    messages = [],
    temperature,
    max_tokens,
    system,
  } = req.body;

  // ── 1. Determinar provider/model ────────────────────────────────────────
  const providerModel =
    req.headers["x-provider"] ||
    req.body.model ||
    req.userModel ||
    process.env.DEFAULT_PROVIDER ||
    "openai:gpt-4o-mini";

  if (req.user?.allowedModels?.length > 0 && !req.user.allowedModels.includes(providerModel)) {
    return res.status(403).json({
      error: {
        message: `Modelo '${providerModel}' não permitido para este token.`,
        type: "model_not_allowed",
      },
    });
  }

  let model;
  try {
    model = resolveModel(providerModel);
  } catch (err) {
    return res.status(400).json({
      error: { message: err.message, type: "invalid_provider" },
    });
  }

  // ── 2. Sanitizar mensagens ──────────────────────────────────────────────
  const { messages: sanitizedMessages, report: sanitizationReport, blocked, blockFindings } =
    sanitizeMessages(messages);

  let sanitizedSystem = system;
  if (system) {
    const result = sanitizeText(system);
    sanitizedSystem = result.sanitized;
    if (result.blocked) {
      logRequest({
        requestId, clientLabel: req.clientLabel, providerModel,
        originalMessages: messages, sanitizedMessages, sanitizationReport,
        durationMs: Date.now() - startTime, blocked: true,
      });
      return _blockedResponse(res, requestId, providerModel, result.blockFindings);
    }
  }

  // ── 3. Verificar bloqueio ───────────────────────────────────────────────
  if (blocked) {
    logRequest({
      requestId, clientLabel: req.clientLabel, providerModel,
      originalMessages: messages, sanitizedMessages, sanitizationReport,
      durationMs: Date.now() - startTime, blocked: true,
    });
    return _blockedResponse(res, requestId, providerModel, blockFindings);
  }

  // ── 4. Chamar o provider ────────────────────────────────────────────────
  try {
    const result = await generateText({
      model,
      messages: sanitizedMessages,
      system: sanitizedSystem,
      temperature,
      maxTokens: max_tokens,
    });

    logRequest({
      requestId, clientLabel: req.clientLabel, providerModel,
      originalMessages: messages, sanitizedMessages, sanitizationReport,
      responseTokens: result.usage?.totalTokens,
      durationMs: Date.now() - startTime,
    });

    res.setHeader("X-Request-Id", requestId);
    if (sanitizationReport.length > 0) {
      res.setHeader("X-Sanitization-Applied", "true");
    }

    return res.json({
      id: requestId,
      object: "chat.completion",
      model: providerModel,
      choices: [{
        index: 0,
        message: { role: "assistant", content: result.text },
        finish_reason: result.finishReason || "stop",
      }],
      usage: {
        prompt_tokens: result.usage?.promptTokens || 0,
        completion_tokens: result.usage?.completionTokens || 0,
        total_tokens: result.usage?.totalTokens || 0,
      },
      gateway: {
        request_id: requestId,
        provider: providerModel,
        sanitization_applied: sanitizationReport.length > 0,
      },
    });
  } catch (err) {
    logRequest({
      requestId, clientLabel: req.clientLabel, providerModel,
      originalMessages: messages, sanitizedMessages, sanitizationReport,
      durationMs: Date.now() - startTime, error: err,
    });
    return res.status(502).json({
      error: {
        message: `Erro ao chamar o provider "${providerModel}": ${err.message}`,
        type: "provider_error",
        request_id: requestId,
      },
    });
  }
});

function _blockedResponse(res, requestId, providerModel, blockFindings) {
  const detectedList = blockFindings
    .map((f) => `${f.label} (${f.count} ocorrência${f.count > 1 ? "s" : ""})`)
    .join(", ");

  const content = `Requisição bloqueada por política de segurança. Dados sensíveis detectados: ${detectedList}.`;

  res.setHeader("X-Request-Id", requestId);
  return res.json({
    id: requestId,
    object: "chat.completion",
    model: providerModel,
    choices: [{
      index: 0,
      message: { role: "assistant", content },
      finish_reason: "content_filter",
    }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    gateway: {
      request_id: requestId,
      provider: providerModel,
      blocked: true,
      block_findings: blockFindings,
    },
  });
}

export default router;
