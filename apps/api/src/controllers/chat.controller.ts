import type { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import { selectAvailableModel } from '../services/quota.service';
import type { OpenAIMessage, OpenAITool, OpenAIToolCall } from '../types';

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

  // Model is always determined by the user's priority queue — clients cannot choose
  const allowedModels = req.user?.allowedModels ?? [];

  if (allowedModels.length === 0) {
    res.status(400).json({
      error: {
        message:
          'Nenhum modelo configurado para este cliente. Configure a fila de modelos no painel admin.',
        type: 'model_not_configured',
      },
    });
    return;
  }

  const selectedModel = selectAvailableModel(allowedModels);

  if (!selectedModel) {
    res.status(429).json({
      error: {
        message: 'Limite de uso atingido para todos os modelos disponíveis.',
        type: 'quota_exceeded',
      },
    });
    return;
  }

  const serviceOpts = {
    messages,
    providerModel: selectedModel,
    clientLabel: req.clientLabel,
    tokenPreview: req.tokenPreview,
    user: req.user,
    system,
    tools: rawTools,
    toolChoice: tool_choice,
    temperature,
    maxTokens: max_tokens,
  };

  if (stream) {
    let handle;
    try {
      handle = await chatService.streamComplete(serviceOpts);
    } catch (err) {
      res.status(502).json({ error: { message: `Erro ao chamar o provider "${selectedModel}": ${(err as Error).message}`, type: 'provider_error' } });
      return;
    }

    const created = Math.floor(Date.now() / 1000);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Request-Id', handle.requestId);

    const firstChunk = { id: handle.requestId, object: 'chat.completion.chunk', created, model: selectedModel, choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }] };
    res.write(`data: ${JSON.stringify(firstChunk)}\n\n`);

    for await (const text of handle.textStream) {
      const chunk = { id: handle.requestId, object: 'chat.completion.chunk', created, model: selectedModel, choices: [{ index: 0, delta: { content: text }, finish_reason: null }] };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    const doneChunk = { id: handle.requestId, object: 'chat.completion.chunk', created, model: selectedModel, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] };
    res.write(`data: ${JSON.stringify(doneChunk)}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  let result;
  try {
    result = await chatService.complete(serviceOpts);
  } catch (err) {
    res.status(502).json({ error: { message: `Erro ao chamar o provider "${selectedModel}": ${(err as Error).message}`, type: 'provider_error' } });
    return;
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
    model: selectedModel,
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
      provider: selectedModel,
    },
  });
}
