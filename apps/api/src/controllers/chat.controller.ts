import type { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import type { FullStreamPart } from '../services/chat.service';
import { store } from '../services/store.service';
import { providersDb } from '../services/providers-db.service';
import { buildFallbackQueue } from '../utils/fallback';
import { isRateLimitError } from '../utils/errors';
import type { OpenAIMessage, OpenAITool, OpenAIToolCall } from '../types';

function makeDeltaChunk(id: string, created: number, model: string, content: string) {
  return { id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { content }, finish_reason: null }] };
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
      try {
        const handle = await chatService.streamRaw({ ...baseOpts, providerModel: candidate });
        const fullIter = handle.fullStream[Symbol.asyncIterator]();

        // Peek at first event — throws if provider rejects immediately (e.g. 429)
        let firstEvent: FullStreamPart | null = null;
        try {
          const firstResult = await fullIter.next();
          if (!firstResult.done) firstEvent = firstResult.value;
        } catch (peekErr) {
          lastStreamErr = { candidate, err: peekErr };
          continue;
        }

        // Stream is alive — write headers now
        const created = Math.floor(Date.now() / 1000);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Request-Id', handle.requestId);

        res.write(`data: ${JSON.stringify({ id: handle.requestId, object: 'chat.completion.chunk', created, model: candidate, choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }] })}\n\n`);

        // Track tool call index by toolCallId (OpenAI uses integer indices)
        const toolCallIndexMap = new Map<string, number>();
        let toolCallCounter = 0;
        let finalFinishReason = 'stop';

        const processEvent = (event: FullStreamPart) => {
          // Cast to any to work around catch-all union member preventing narrowing
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const e = event as any;
          if (e.type === 'text-delta') {
            res.write(`data: ${JSON.stringify(makeDeltaChunk(handle.requestId, created, candidate, e.textDelta as string))}\n\n`);
          } else if (e.type === 'tool-call-streaming-start') {
            const idx = toolCallCounter++;
            toolCallIndexMap.set(e.toolCallId as string, idx);
            res.write(`data: ${JSON.stringify({
              id: handle.requestId, object: 'chat.completion.chunk', created, model: candidate,
              choices: [{ index: 0, delta: { tool_calls: [{ index: idx, id: e.toolCallId, type: 'function', function: { name: e.toolName, arguments: '' } }] }, finish_reason: null }],
            })}\n\n`);
          } else if (e.type === 'tool-call-delta') {
            const idx = toolCallIndexMap.get(e.toolCallId as string) ?? 0;
            res.write(`data: ${JSON.stringify({
              id: handle.requestId, object: 'chat.completion.chunk', created, model: candidate,
              choices: [{ index: 0, delta: { tool_calls: [{ index: idx, function: { arguments: e.argsTextDelta } }] }, finish_reason: null }],
            })}\n\n`);
          } else if (e.type === 'tool-call') {
            // Non-streaming tool call (full args at once) — emit as a single chunk
            if (!toolCallIndexMap.has(e.toolCallId as string)) {
              const idx = toolCallCounter++;
              toolCallIndexMap.set(e.toolCallId as string, idx);
              res.write(`data: ${JSON.stringify({
                id: handle.requestId, object: 'chat.completion.chunk', created, model: candidate,
                choices: [{ index: 0, delta: { tool_calls: [{ index: idx, id: e.toolCallId, type: 'function', function: { name: e.toolName, arguments: JSON.stringify(e.args) } }] }, finish_reason: null }],
              })}\n\n`);
            }
          } else if (e.type === 'finish') {
            finalFinishReason = (e.finishReason as string) === 'tool-calls' ? 'tool_calls' : ((e.finishReason as string) || 'stop');
          } else if (e.type === 'error') {
            const errText = `⚠️ **Erro no LLM Switch**\n\nErro durante o stream do modelo \`${candidate}\`.\n\n**Detalhes:** ${String(e.error)}`;
            res.write(`data: ${JSON.stringify(makeDeltaChunk(handle.requestId, created, candidate, errText))}\n\n`);
          }
        };

        if (firstEvent) processEvent(firstEvent);

        try {
          let next = await fullIter.next();
          while (!next.done) {
            processEvent(next.value);
            next = await fullIter.next();
          }
        } catch (streamErr) {
          const errText = `⚠️ **Erro no LLM Switch**\n\nErro durante o stream do modelo \`${candidate}\`.\n\n**Detalhes:** ${(streamErr as Error).message}`;
          res.write(`data: ${JSON.stringify(makeDeltaChunk(handle.requestId, created, candidate, errText))}\n\n`);
        }

        res.write(`data: ${JSON.stringify({ id: handle.requestId, object: 'chat.completion.chunk', created, model: candidate, choices: [{ index: 0, delta: {}, finish_reason: finalFinishReason }] })}\n\n`);
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
