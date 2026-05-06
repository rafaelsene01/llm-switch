import type { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import { selectAvailableModel } from '../services/quota.service';
import type { OpenAIMessage, OpenAITool, OpenAIToolCall } from '../types';

function formatStreamError(model: string, message: string): string {
  return `⚠️ **Erro no LLM Switch**\n\nO modelo \`${model}\` não é compatível com esta requisição.\n\n**Detalhes:** ${message}\n\n**O que fazer:** Acesse o painel admin do LLM Switch e troque o modelo configurado para um que suporte as funcionalidades necessárias (ex: suporte a ferramentas/tool_choice).`;
}

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

  // Model is always determined by the user's priority queue — clients cannot choose.
  // Fall back to req.userModel for backward compatibility with users that have model but no allowedModels.
  const allowedModels = req.user?.allowedModels ?? [];
  const candidates = allowedModels.length > 0
    ? allowedModels
    : req.userModel ? [req.userModel] : [];

  if (candidates.length === 0) {
    res.status(400).json({
      error: {
        message:
          'Nenhum modelo configurado para este cliente. Configure a fila de modelos no painel admin.',
        type: 'model_not_configured',
      },
    });
    return;
  }

  const selectedModel = selectAvailableModel(candidates);

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

    res.write(`data: ${JSON.stringify({ id: handle.requestId, object: 'chat.completion.chunk', created, model: selectedModel, choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }] })}\n\n`);

    try {
      for await (const text of handle.textStream) {
        res.write(`data: ${JSON.stringify(makeDeltaChunk(handle.requestId, created, selectedModel, text))}\n\n`);
      }
    } catch (streamErr) {
      const errText = formatStreamError(selectedModel, (streamErr as Error).message);
      res.write(`data: ${JSON.stringify(makeDeltaChunk(handle.requestId, created, selectedModel, errText))}\n\n`);
      res.write(`data: ${JSON.stringify(makeDoneChunk(handle.requestId, created, selectedModel))}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const internalErr = handle.getStreamError();
    if (internalErr) {
      const errText = formatStreamError(selectedModel, internalErr.message);
      res.write(`data: ${JSON.stringify(makeDeltaChunk(handle.requestId, created, selectedModel, errText))}\n\n`);
    }

    res.write(`data: ${JSON.stringify(makeDoneChunk(handle.requestId, created, selectedModel))}\n\n`);
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
