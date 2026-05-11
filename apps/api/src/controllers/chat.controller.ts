import type { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import { store } from '../services/store.service';
import { providersDb } from '../services/providers-db.service';
import { buildFallbackQueue, peekFirstChunk } from '../utils/fallback';
import { isRateLimitError } from '../utils/errors';
import type { OpenAIMessage, OpenAITool, OpenAIToolCall } from '../types';

function makeDeltaChunk(id: string, created: number, model: string, content: string) {
  return { id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { content }, finish_reason: null }] };
}

function makeDoneChunk(id: string, created: number, model: string) {
  return { id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] };
}

export async function chatCompletions(req: Request, res: Response): Promise<void> {
  const {
    messages = [],
    temperature,
    max_tokens,
    system,
    tools: rawTools,
    tool_choice,
    stream = false,
  } = req.body as {
    messages?: OpenAIMessage[];
    temperature?: number;
    max_tokens?: number;
    system?: string;
    tools?: OpenAITool[];
    tool_choice?: string | { type: 'function'; function: { name: string } };
    stream?: boolean;
  };

  const allowedModels = req.user?.allowedModels ?? [];
  const candidates = allowedModels.length > 0
    ? allowedModels
    : req.userModel ? [req.userModel] : [];

  if (candidates.length === 0) {
    res.status(400).json({
      error: {
        message: 'Nenhum modelo configurado para este cliente. Configure a fila de modelos no painel admin.',
        type: 'model_not_configured',
      },
    });
    return;
  }

  const queue = buildFallbackQueue(candidates, store.getModels(), providersDb.list());

  const baseOpts = {
    messages,
    clientLabel: req.clientLabel,
    tokenPreview: req.tokenPreview,
    user: req.user,
    system,
    tools: rawTools,
    toolChoice: tool_choice,
    temperature,
    maxTokens: max_tokens,
  };

  // ── Streaming ──────────────────────────────────────────────────────────────
  if (stream) {
    let lastStreamErr: { candidate: string; err: unknown } | null = null;
    for (const candidate of queue) {
      let handle;
      try {
        handle = await chatService.streamComplete({ ...baseOpts, providerModel: candidate });
        // Peek at first chunk — throws if provider rejects immediately (e.g. 429)
        const { first, rest } = await peekFirstChunk(handle.textStream);

        // Stream is alive — write headers now
        const created = Math.floor(Date.now() / 1000);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Request-Id', handle.requestId);

        res.write(`data: ${JSON.stringify({ id: handle.requestId, object: 'chat.completion.chunk', created, model: candidate, choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }] })}\n\n`);

        if (first) {
          res.write(`data: ${JSON.stringify(makeDeltaChunk(handle.requestId, created, candidate, first))}\n\n`);
        }

        try {
          for await (const text of rest) {
            res.write(`data: ${JSON.stringify(makeDeltaChunk(handle.requestId, created, candidate, text))}\n\n`);
          }
        } catch (streamErr) {
          const errText = `⚠️ **Erro no LLM Switch**\n\nErro durante o stream do modelo \`${candidate}\`.\n\n**Detalhes:** ${(streamErr as Error).message}`;
          res.write(`data: ${JSON.stringify(makeDeltaChunk(handle.requestId, created, candidate, errText))}\n\n`);
        }

        const internalErr = handle.getStreamError();
        if (internalErr) {
          const errText = `⚠️ **Erro no LLM Switch**\n\nO modelo \`${candidate}\` não é compatível com esta requisição.\n\n**Detalhes:** ${internalErr.message}`;
          res.write(`data: ${JSON.stringify(makeDeltaChunk(handle.requestId, created, candidate, errText))}\n\n`);
        }

        res.write(`data: ${JSON.stringify(makeDoneChunk(handle.requestId, created, candidate))}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      } catch (err) {
        lastStreamErr = { candidate, err };
        continue;
      }
    }

    if (lastStreamErr && !isRateLimitError(lastStreamErr.err)) {
      res.status(502).json({ error: { message: `Erro ao chamar o provider "${lastStreamErr.candidate}": ${(lastStreamErr.err as Error).message}`, type: 'provider_error' } });
    } else {
      res.status(429).json({ error: { message: 'Rate limit atingido em todos os modelos disponíveis.', type: 'quota_exceeded' } });
    }
    return;
  }

  // ── Non-streaming ──────────────────────────────────────────────────────────
  let lastErr: { candidate: string; err: unknown } | null = null;
  for (const candidate of queue) {
    let result;
    try {
      result = await chatService.complete({ ...baseOpts, providerModel: candidate });
    } catch (err) {
      lastErr = { candidate, err };
      continue;
    }

    res.setHeader('X-Request-Id', result.requestId);

    const hasToolCalls = (result.toolCalls?.length ?? 0) > 0;
    const openaiToolCalls: OpenAIToolCall[] | undefined = hasToolCalls
      ? result.toolCalls!.map((tc) => ({
        id: tc.toolCallId,
        type: 'function' as const,
        function: {
          name: tc.toolName,
          arguments: JSON.stringify(tc.args),
        },
      }))
      : undefined;

    const finishReason =
      result.finishReason === 'tool-calls' ? 'tool_calls' : result.finishReason || 'stop';

    res.json({
      id: result.requestId,
      object: 'chat.completion',
      model: candidate,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: result.text ?? null,
            ...(openaiToolCalls ? { tool_calls: openaiToolCalls } : {}),
          },
          finish_reason: finishReason,
        },
      ],
      usage: {
        prompt_tokens: result.usage.promptTokens,
        completion_tokens: result.usage.completionTokens,
        total_tokens: result.usage.totalTokens,
      },
      gateway: {
        request_id: result.requestId,
        provider: candidate,
      },
    });
    return;
  }

  if (lastErr && !isRateLimitError(lastErr.err)) {
    res.status(502).json({ error: { message: `Erro ao chamar o provider "${lastErr.candidate}": ${(lastErr.err as Error).message}`, type: 'provider_error' } });
  } else {
    res.status(429).json({ error: { message: 'Rate limit atingido em todos os modelos disponíveis.', type: 'quota_exceeded' } });
  }
}
