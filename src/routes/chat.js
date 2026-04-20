import { Router } from "express";
import { generateText, jsonSchema } from "ai";
import { v4 as uuidv4 } from "uuid";
import { resolveModel } from "../providers.js";
import { sanitizeMessages, sanitizeText } from "../sanitizer/index.js";
import { logRequest } from "../utils/logger.js";

const router = Router();

function convertTools(openaiTools) {
  if (!openaiTools?.length) return undefined;
  const tools = {};
  for (const tool of openaiTools) {
    if (tool.type === "function") {
      tools[tool.function.name] = {
        description: tool.function.description,
        parameters: jsonSchema(tool.function.parameters || { type: "object", properties: {} }),
      };
    }
  }
  return Object.keys(tools).length > 0 ? tools : undefined;
}

function convertToolChoice(toolChoice) {
  if (!toolChoice) return undefined;
  if (typeof toolChoice === "string") return toolChoice;
  if (toolChoice.type === "function") return { type: "tool", toolName: toolChoice.function.name };
  return "auto";
}

function convertMessagesToCore(messages) {
  return messages.map((msg) => {
    if (msg.role === "assistant" && msg.tool_calls?.length) {
      return {
        role: "assistant",
        content: [
          ...(msg.content ? [{ type: "text", text: msg.content }] : []),
          ...msg.tool_calls.map((tc) => ({
            type: "tool-call",
            toolCallId: tc.id,
            toolName: tc.function.name,
            args: (() => { try { return JSON.parse(tc.function.arguments); } catch { return {}; } })(),
          })),
        ],
      };
    }
    if (msg.role === "tool") {
      return {
        role: "tool",
        content: [{
          type: "tool-result",
          toolCallId: msg.tool_call_id,
          toolName: msg.name || "",
          result: msg.content,
        }],
      };
    }
    return msg;
  });
}

// ─── POST /v1/chat/completions ────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const requestId = uuidv4();
  const startTime = Date.now();

  const {
    messages = [],
    temperature,
    max_tokens,
    system,
    tools: rawTools,
    tool_choice,
  } = req.body;

  // ── 1. Determinar provider/model ────────────────────────────────────────
  const providerModel =
    req.headers["x-provider"] ||
    req.body.model ||
    req.userModel ||
    process.env.DEFAULT_PROVIDER ||
    null;

  if (!providerModel) {
    return res.status(400).json({
      error: {
        message:
          "Nenhum modelo configurado para este cliente. Atribua um modelo ao usuário, defina DEFAULT_PROVIDER no servidor ou informe o modelo na requisição (header X-Provider ou campo model).",
        type: "model_not_configured",
      },
    });
  }

  const allowedModels = req.user?.allowedModels ?? [];
  const userDefaultModel = req.userModel || process.env.DEFAULT_PROVIDER || null;

  if (allowedModels.length > 0) {
    if (!allowedModels.includes(providerModel)) {
      return res.status(403).json({
        error: {
          message: `Modelo '${providerModel}' não permitido para este token.`,
          type: "model_not_allowed",
        },
      });
    }
  } else if (userDefaultModel && providerModel !== userDefaultModel) {
    return res.status(403).json({
      error: {
        message: `Modelo '${providerModel}' não permitido. Nenhum modelo extra foi liberado para este token; apenas o modelo padrão '${userDefaultModel}' está disponível.`,
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
  const sdkTools = convertTools(rawTools);
  const sdkToolChoice = convertToolChoice(tool_choice);
  const coreMessages = convertMessagesToCore(sanitizedMessages);

  try {
    const result = await generateText({
      model,
      messages: coreMessages,
      system: sanitizedSystem,
      temperature,
      maxTokens: max_tokens,
      ...(sdkTools ? { tools: sdkTools } : {}),
      ...(sdkToolChoice ? { toolChoice: sdkToolChoice } : {}),
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

    const hasToolCalls = result.toolCalls?.length > 0;
    const openaiToolCalls = hasToolCalls
      ? result.toolCalls.map((tc) => ({
          id: tc.toolCallId,
          type: "function",
          function: {
            name: tc.toolName,
            arguments: JSON.stringify(tc.args),
          },
        }))
      : undefined;

    const finishReason = result.finishReason === "tool-calls"
      ? "tool_calls"
      : result.finishReason || "stop";

    return res.json({
      id: requestId,
      object: "chat.completion",
      model: providerModel,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: result.text || null,
          ...(openaiToolCalls ? { tool_calls: openaiToolCalls } : {}),
        },
        finish_reason: finishReason,
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
