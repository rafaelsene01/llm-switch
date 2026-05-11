import type { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import { store } from '../services/store.service';
import { providersDb } from '../services/providers-db.service';
import { buildFallbackQueue } from '../utils/fallback';
import { isRateLimitError } from '../utils/errors';
import {
  messagesAnthropicToOpenAI,
  toolsAnthropicToOpenAI,
  toolChoiceAnthropicToOpenAI,
  buildAnthropicResponse,
  finishReasonToAnthropic,
  type AnthropicRequest,
} from '../utils/anthropic-format';

function sendEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function anthropicMessages(req: Request, res: Response): Promise<void> {
  const body = req.body as AnthropicRequest;
  const { messages = [], system, max_tokens, tools: rawTools, tool_choice, temperature, stream = false } = body;

  const openaiMessages = messagesAnthropicToOpenAI(messages);
  const openaiTools = rawTools?.length ? toolsAnthropicToOpenAI(rawTools) : undefined;
  const openaiToolChoice = toolChoiceAnthropicToOpenAI(tool_choice);

  const allowedModels = req.user?.allowedModels ?? [];
  const candidates = allowedModels.length > 0
    ? allowedModels
    : req.userModel ? [req.userModel] : [];

  if (candidates.length === 0) {
    res.status(400).json({
      type: 'error',
      error: { type: 'invalid_request_error', message: 'No models configured for this client. Configure the model queue in the admin panel.' },
    });
    return;
  }

  const queue = buildFallbackQueue(candidates, store.getModels(), providersDb.list());

  const baseOpts = {
    messages: openaiMessages,
    clientLabel: req.clientLabel,
    tokenPreview: req.tokenPreview,
    user: req.user,
    system,
    tools: openaiTools,
    toolChoice: openaiToolChoice,
    temperature,
    maxTokens: max_tokens,
  };

  // ── Non-streaming ────────────────────────────────────────────────────────
  if (!stream) {
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
      res.json(buildAnthropicResponse({
        requestId: result.requestId,
        text: result.text,
        toolCalls: result.toolCalls,
        finishReason: result.finishReason,
        usage: result.usage,
        modelId: candidate,
      }));
      return;
    }

    if (lastErr && !isRateLimitError(lastErr.err)) {
      res.status(502).json({ type: 'error', error: { type: 'api_error', message: `Provider error for "${lastErr.candidate}": ${(lastErr.err as Error).message}` } });
    } else {
      res.status(429).json({ type: 'error', error: { type: 'rate_limit_error', message: 'Rate limit reached on all available models.' } });
    }
    return;
  }

  // ── Streaming ────────────────────────────────────────────────────────────
  let lastStreamErr: { candidate: string; err: unknown } | null = null;

  for (const candidate of queue) {
    let handle;
    try {
      handle = await chatService.streamRaw({ ...baseOpts, providerModel: candidate });
    } catch (err) {
      lastStreamErr = { candidate, err };
      continue;
    }

    const iter = handle.fullStream[Symbol.asyncIterator]();
    let firstResult: IteratorResult<unknown>;
    try {
      firstResult = await iter.next();
    } catch (err) {
      if (isRateLimitError(err)) { lastStreamErr = { candidate, err }; continue; }
      lastStreamErr = { candidate, err };
      break;
    }

    // Headers committed — from here on we can only write SSE events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('anthropic-version', '2023-06-01');
    res.setHeader('X-Request-Id', handle.requestId);

    sendEvent(res, 'message_start', {
      type: 'message_start',
      message: {
        id: `msg_${handle.requestId}`,
        type: 'message',
        role: 'assistant',
        content: [],
        model: candidate,
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 1 },
      },
    });
    sendEvent(res, 'ping', { type: 'ping' });

    let blockIndex = 0;
    let textBlockOpen = false;
    const openToolBlocks = new Set<string>();
    let finalFinishReason = 'end_turn';
    let finalUsage = { promptTokens: 0, completionTokens: 0 };

    const processEvent = (part: unknown) => {
      const p = part as { type: string; [k: string]: unknown };

      if (p.type === 'text-delta') {
        if (!textBlockOpen) {
          sendEvent(res, 'content_block_start', { type: 'content_block_start', index: blockIndex, content_block: { type: 'text', text: '' } });
          textBlockOpen = true;
        }
        sendEvent(res, 'content_block_delta', { type: 'content_block_delta', index: blockIndex, delta: { type: 'text_delta', text: p.textDelta } });
        return;
      }

      if (p.type === 'tool-call-streaming-start') {
        if (textBlockOpen) {
          sendEvent(res, 'content_block_stop', { type: 'content_block_stop', index: blockIndex });
          blockIndex++;
          textBlockOpen = false;
        }
        openToolBlocks.add(p.toolCallId as string);
        sendEvent(res, 'content_block_start', { type: 'content_block_start', index: blockIndex, content_block: { type: 'tool_use', id: p.toolCallId, name: p.toolName, input: {} } });
        return;
      }

      if (p.type === 'tool-call-delta') {
        if (openToolBlocks.has(p.toolCallId as string)) {
          sendEvent(res, 'content_block_delta', { type: 'content_block_delta', index: blockIndex, delta: { type: 'input_json_delta', partial_json: p.argsTextDelta } });
        }
        return;
      }

      if (p.type === 'tool-call') {
        // Model doesn't stream tool inputs — emit the whole block at once
        if (!openToolBlocks.has(p.toolCallId as string)) {
          if (textBlockOpen) {
            sendEvent(res, 'content_block_stop', { type: 'content_block_stop', index: blockIndex });
            blockIndex++;
            textBlockOpen = false;
          }
          sendEvent(res, 'content_block_start', { type: 'content_block_start', index: blockIndex, content_block: { type: 'tool_use', id: p.toolCallId, name: p.toolName, input: {} } });
          openToolBlocks.add(p.toolCallId as string);
          const argsJson = typeof p.args === 'string' ? p.args : JSON.stringify(p.args ?? {});
          sendEvent(res, 'content_block_delta', { type: 'content_block_delta', index: blockIndex, delta: { type: 'input_json_delta', partial_json: argsJson } });
        }
        sendEvent(res, 'content_block_stop', { type: 'content_block_stop', index: blockIndex });
        openToolBlocks.delete(p.toolCallId as string);
        blockIndex++;
        return;
      }

      if (p.type === 'finish') {
        const u = p.usage as { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
        finalFinishReason = finishReasonToAnthropic(p.finishReason as string);
        finalUsage = { promptTokens: u?.promptTokens ?? 0, completionTokens: u?.completionTokens ?? 0 };
      }
    };

    try {
      // Process the first event we already peeked
      if (!firstResult.done) processEvent(firstResult.value);

      // Process the rest
      let next = await iter.next();
      while (!next.done) {
        processEvent(next.value);
        next = await iter.next();
      }
    } catch {
      // Stream error — we already committed headers, write as much as possible
    }

    // Close any still-open text block
    if (textBlockOpen) {
      sendEvent(res, 'content_block_stop', { type: 'content_block_stop', index: blockIndex });
    }

    sendEvent(res, 'message_delta', {
      type: 'message_delta',
      delta: { stop_reason: finalFinishReason, stop_sequence: null },
      usage: { output_tokens: finalUsage.completionTokens },
    });
    sendEvent(res, 'message_stop', { type: 'message_stop' });
    res.end();
    return;
  }

  if (lastStreamErr && !isRateLimitError(lastStreamErr.err)) {
    res.status(502).json({ type: 'error', error: { type: 'api_error', message: `Provider error for "${lastStreamErr.candidate}": ${(lastStreamErr.err as Error).message}` } });
  } else {
    res.status(429).json({ type: 'error', error: { type: 'rate_limit_error', message: 'Rate limit reached on all available models.' } });
  }
}
