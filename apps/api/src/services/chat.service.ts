import { generateText, streamText, jsonSchema } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { resolveModel } from '../providers';
import { logRequest } from '../utils/logger';
import { activityLog } from './activity-log.service';
import { store } from './store.service';
import type { OpenAIMessage, OpenAITool } from '../types';

export interface ChatServiceOptions {
  messages: OpenAIMessage[];
  providerModel: string;
  clientLabel: string;
  tokenPreview: string;
  user: {
    id: string;
    name: string;
    model: string | null;
    allowedModels: string[];
  } | null;
  system?: string;
  tools?: OpenAITool[];
  toolChoice?: string | { type: 'function'; function: { name: string } };
  temperature?: number;
  maxTokens?: number;
}

export interface ChatServiceResult {
  requestId: string;
  text: string | null;
  toolCalls?: Array<{ toolCallId: string; toolName: string; args: unknown }>;
  finishReason: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  providerModel: string;
  durationMs: number;
}

function convertTools(openaiTools?: OpenAITool[]) {
  if (!openaiTools?.length) return undefined;
  const tools: Record<string, { description?: string; parameters: ReturnType<typeof jsonSchema> }> =
    {};
  for (const tool of openaiTools) {
    if (tool.type === 'function') {
      tools[tool.function.name] = {
        description: tool.function.description,
        parameters: jsonSchema(
          tool.function.parameters ?? { type: 'object', properties: {} }
        ),
      };
    }
  }
  return Object.keys(tools).length > 0 ? tools : undefined;
}

function computeCosts(providerModel: string, promptTokens: number, completionTokens: number): { inputCostUsd: number; outputCostUsd: number } {
  const model = store.getModels().find((m) => m.value === providerModel);
  if (!model?.inputCostPer1M && !model?.outputCostPer1M) return { inputCostUsd: 0, outputCostUsd: 0 };
  return {
    inputCostUsd: (promptTokens / 1_000_000) * (model.inputCostPer1M ?? 0),
    outputCostUsd: (completionTokens / 1_000_000) * (model.outputCostPer1M ?? 0),
  };
}

function convertToolChoice(
  toolChoice?: ChatServiceOptions['toolChoice']
): 'auto' | 'none' | 'required' | { type: 'tool'; toolName: string } | undefined {
  if (!toolChoice) return undefined;
  if (typeof toolChoice === 'string') return toolChoice as 'auto' | 'none' | 'required';
  if (toolChoice.type === 'function')
    return { type: 'tool', toolName: toolChoice.function.name };
  return 'auto';
}

function convertMessagesToCore(messages: OpenAIMessage[]) {
  return messages.map((msg) => {
    if (msg.role === 'assistant' && msg.tool_calls?.length) {
      return {
        role: 'assistant' as const,
        content: [
          ...(msg.content ? [{ type: 'text' as const, text: msg.content }] : []),
          ...msg.tool_calls.map((tc) => ({
            type: 'tool-call' as const,
            toolCallId: tc.id,
            toolName: tc.function.name,
            args: (() => {
              try {
                return JSON.parse(tc.function.arguments);
              } catch {
                return {};
              }
            })(),
          })),
        ],
      };
    }
    if (msg.role === 'tool') {
      return {
        role: 'tool' as const,
        content: [
          {
            type: 'tool-result' as const,
            toolCallId: msg.tool_call_id ?? '',
            toolName: msg.name ?? '',
            result: msg.content,
          },
        ],
      };
    }
    return msg as { role: 'system' | 'user' | 'assistant'; content: string };
  });
}

function extractTextFromResult(text: string | null | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0] as Record<string, unknown>;
        const candidate = first?.output ?? first?.text ?? first?.content ?? first?.message;
        if (typeof candidate === 'string') return candidate;
      }
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        const candidate = obj?.output ?? obj?.text ?? obj?.content ?? obj?.message;
        if (typeof candidate === 'string') return candidate;
      }
    } catch {
      // not JSON — return as-is
    }
  }
  return text;
}

export interface ChatStreamHandle {
  requestId: string;
  textStream: AsyncIterable<string>;
  finishStream: Promise<void>;
  getStreamError: () => Error | null;
}

export class ChatService {
  async streamComplete(opts: ChatServiceOptions): Promise<ChatStreamHandle> {
    const requestId = uuidv4();
    const startTime = Date.now();

    const { messages, providerModel, clientLabel, tokenPreview, system, tools: rawTools, toolChoice, temperature, maxTokens } = opts;

    const model = resolveModel(providerModel);
    const sdkTools = convertTools(rawTools);
    const sdkToolChoice = convertToolChoice(toolChoice);
    const coreMessages = convertMessagesToCore(messages);

    let capturedStreamError: Error | null = null;

    const result = streamText({
      model,
      messages: coreMessages,
      system,
      temperature,
      maxTokens,
      ...(sdkTools ? { tools: sdkTools } : {}),
      ...(sdkToolChoice ? { toolChoice: sdkToolChoice } : {}),
      onError: ({ error }) => {
        capturedStreamError = error as Error;
      },
      onFinish: async ({ usage, text }) => {
        const durationMs = Date.now() - startTime;
        const promptTokens = usage?.promptTokens ?? 0;
        const completionTokens = usage?.completionTokens ?? 0;
        const { inputCostUsd, outputCostUsd } = computeCosts(providerModel, promptTokens, completionTokens);
        logRequest({ requestId, clientLabel, providerModel, originalMessages: messages, responseTokens: usage?.totalTokens, durationMs });
        activityLog.log({
          requestId,
          userName: opts.user?.name ?? clientLabel,
          tokenPreview,
          originalMessages: messages as Array<{ role: string; content: unknown }>,
          llmResponse: extractTextFromResult(text),
          providerModel,
          blocked: false,
          promptTokens,
          completionTokens,
          totalTokens: usage?.totalTokens ?? 0,
          costUsd: inputCostUsd + outputCostUsd,
          inputCostUsd,
          outputCostUsd,
        });
      },
    });

    const finishStream = result.consumeStream().catch(() => { });

    return { requestId, textStream: result.textStream, finishStream, getStreamError: () => capturedStreamError };
  }

  async complete(opts: ChatServiceOptions): Promise<ChatServiceResult> {
    const requestId = uuidv4();
    const startTime = Date.now();

    const {
      messages,
      providerModel,
      clientLabel,
      tokenPreview,
      system,
      tools: rawTools,
      toolChoice,
      temperature,
      maxTokens,
    } = opts;

    const model = resolveModel(providerModel);
    const sdkTools = convertTools(rawTools);
    const sdkToolChoice = convertToolChoice(toolChoice);
    const coreMessages = convertMessagesToCore(messages);

    let result;
    try {
      result = await generateText({
        model,
        messages: coreMessages,
        system,
        temperature,
        maxTokens,
        ...(sdkTools ? { tools: sdkTools } : {}),
        ...(sdkToolChoice ? { toolChoice: sdkToolChoice } : {}),
      });
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMessage = (err as Error).message;
      logRequest({
        requestId,
        clientLabel,
        providerModel,
        originalMessages: messages,
        durationMs,
        error: err as Error,
      });
      activityLog.log({
        requestId,
        userName: opts.user?.name ?? clientLabel,
        tokenPreview,
        originalMessages: messages as Array<{ role: string; content: unknown }>,

        llmResponse: null,
        providerModel,
        blocked: false,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        inputCostUsd: 0,
        outputCostUsd: 0,
        errorMessage,
      });
      throw err;
    }

    const durationMs = Date.now() - startTime;

    logRequest({
      requestId,
      clientLabel,
      providerModel,
      originalMessages: messages,
      responseTokens: result.usage?.totalTokens,
      durationMs,
    });

    const promptTokens = result.usage?.promptTokens ?? 0;
    const completionTokens = result.usage?.completionTokens ?? 0;
    const { inputCostUsd, outputCostUsd } = computeCosts(providerModel, promptTokens, completionTokens);

    activityLog.log({
      requestId,
      userName: opts.user?.name ?? clientLabel,
      tokenPreview,
      originalMessages: messages as Array<{ role: string; content: unknown }>,
      llmResponse: extractTextFromResult(result.text),
      providerModel,
      blocked: false,
      promptTokens,
      completionTokens,
      totalTokens: result.usage?.totalTokens ?? 0,
      costUsd: inputCostUsd + outputCostUsd,
      inputCostUsd,
      outputCostUsd,
    });

    return {
      requestId,
      text: result.text ?? null,
      toolCalls: result.toolCalls,
      finishReason: result.finishReason ?? 'stop',
      usage: {
        promptTokens: result.usage?.promptTokens ?? 0,
        completionTokens: result.usage?.completionTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
      },
      providerModel,
      durationMs,
    };
  }
}

export const chatService = new ChatService();
