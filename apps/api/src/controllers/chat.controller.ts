import type { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import type { OpenAIMessage, OpenAITool, OpenAIToolCall } from '../types';

export async function chatCompletions(req: Request, res: Response): Promise<void> {
  const {
    messages = [],
    temperature,
    max_tokens,
    system,
    tools: rawTools,
    tool_choice,
  } = req.body as {
    messages?: OpenAIMessage[];
    temperature?: number;
    max_tokens?: number;
    system?: string;
    tools?: OpenAITool[];
    tool_choice?: string | { type: 'function'; function: { name: string } };
  };

  const providerModel =
    (req.body as { model?: string }).model ||
    req.userModel;

  if (!providerModel) {
    res.status(400).json({
      error: {
        message:
          'Nenhum modelo configurado para este cliente. Atribua um modelo ao usuário, defina DEFAULT_PROVIDER no servidor ou informe o modelo na requisição.',
        type: 'model_not_configured',
      },
    });
    return;
  }

  const allowedModels = req.user?.allowedModels ?? [];
  const userDefaultModel = req.userModel;

  if (allowedModels.length > 0) {
    if (!allowedModels.includes(providerModel)) {
      res.status(403).json({
        error: {
          message: `Modelo '${providerModel}' não permitido para este token.`,
          type: 'model_not_allowed',
        },
      });
      return;
    }
  } else if (userDefaultModel && providerModel !== userDefaultModel) {
    res.status(403).json({
      error: {
        message: `Modelo '${providerModel}' não permitido. Apenas o modelo padrão '${userDefaultModel}' está disponível.`,
        type: 'model_not_allowed',
      },
    });
    return;
  }

  let result;
  try {
    result = await chatService.complete({
      messages,
      providerModel,
      clientLabel: req.clientLabel,
      tokenPreview: req.tokenPreview,
      user: req.user,
      system,
      tools: rawTools,
      toolChoice: tool_choice,
      temperature,
      maxTokens: max_tokens,
    });
  } catch (err) {
    const message = (err as Error).message;
    res.status(502).json({
      error: {
        message: `Erro ao chamar o provider "${providerModel}": ${message}`,
        type: 'provider_error',
      },
    });
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
    model: providerModel,
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
      provider: providerModel,
    },
  });
}
