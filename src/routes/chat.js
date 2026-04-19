import { Router } from "express";
import { generateText, streamText } from "ai";
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
    stream = false,
    temperature,
    max_tokens,
    system,
  } = req.body;

  // ── 1. Determinar provider/model ────────────────────────────────────────
  // Prioridade: header X-Provider > body.model > modelo do usuário > DEFAULT_PROVIDER
  const providerModel =
    req.headers["x-provider"] ||
    req.body.model ||
    req.userModel ||                          // modelo atribuído ao usuário no store
    process.env.DEFAULT_PROVIDER ||
    "openai:gpt-4o-mini";

  let model;
  try {
    model = resolveModel(providerModel);
  } catch (err) {
    return res.status(400).json({
      error: { message: err.message, type: "invalid_provider" },
    });
  }

  // ── 2. Sanitizar mensagens ──────────────────────────────────────────────
  const { messages: sanitizedMessages, report: sanitizationReport } =
    sanitizeMessages(messages);

  let sanitizedSystem = system;
  if (system) {
    const { sanitized } = sanitizeText(system);
    sanitizedSystem = sanitized;
  }

  // ── 3. Chamar o provider ────────────────────────────────────────────────
  try {
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Request-Id", requestId);

      const result = streamText({
        model,
        messages: sanitizedMessages,
        system: sanitizedSystem,
        temperature,
        maxTokens: max_tokens,
      });

      for await (const chunk of result.textStream) {
        const data = JSON.stringify({
          id: requestId,
          object: "chat.completion.chunk",
          choices: [{ delta: { content: chunk }, finish_reason: null }],
        });
        res.write(`data: ${data}\n\n`);
      }

      res.write("data: [DONE]\n\n");
      res.end();

      const usage = await result.usage;
      logRequest({
        requestId, clientLabel: req.clientLabel, providerModel,
        originalMessages: messages, sanitizedMessages, sanitizationReport,
        responseTokens: usage?.totalTokens || 0,
        durationMs: Date.now() - startTime,
      });
    } else {
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
    }
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

export default router;
