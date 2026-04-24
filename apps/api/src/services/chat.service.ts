import { generateText, jsonSchema } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { resolveModel } from '../providers';
import { sanitizer } from './sanitizer.service';
import { logRequest } from '../utils/logger';
import { activityLog } from './activity-log.service';
import type { OpenAIMessage, OpenAITool, BlocklistFinding, SanitizeFinding, SanitizationRoles } from '../types';
import { DEFAULT_SANITIZATION_ROLES } from '../types';

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
    sanitizationRoles: SanitizationRoles;
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
  sanitizationReport: SanitizeFinding[];
  blocked: boolean;
  blockFindings: BlocklistFinding[];
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

export class ChatService {
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

    const roles: SanitizationRoles = opts.user?.sanitizationRoles ?? DEFAULT_SANITIZATION_ROLES;
    const model = resolveModel(providerModel);

    // Sanitize messages (only for enabled roles)
    const { messages: sanitizedMessages, report, blocked, blockFindings } =
      sanitizer.sanitizeMessages(messages as Array<{ role: string; content: unknown }>, roles);

    // For sanitized log: only include messages whose role had sanitization enabled
    function filterSanitizedForLog(
      msgs: Array<{ role: string; content: unknown }>
    ): Array<{ role: string; content: unknown }> {
      return msgs.filter((m) => {
        if (m.role === 'system') return roles.system;
        if (m.role === 'user')   return roles.user;
        if (m.role === 'tool')   return roles.tool;
        return false;
      });
    }

    let sanitizedSystem = system;
    if (system && roles.system) {
      const result = sanitizer.sanitizeText(system);
      sanitizedSystem = result.sanitized;
      if (result.blocked) {
        const durationMs = Date.now() - startTime;
        logRequest({
          requestId,
          clientLabel,
          providerModel,
          originalMessages: messages,
          sanitizedMessages,
          sanitizationReport: report.flatMap((r) => r.findings),
          durationMs,
          blocked: true,
        });
        activityLog.log({
          requestId,
          userName: opts.user?.name ?? clientLabel,
          tokenPreview,
          originalMessages: messages as Array<{ role: string; content: unknown }>,
          sanitizedMessages: filterSanitizedForLog(sanitizedMessages as Array<{ role: string; content: unknown }>),
          llmResponse: null,
          providerModel,
          blocked: true,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        });
        return {
          requestId,
          text: null,
          finishReason: 'content_filter',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          sanitizationReport: report.flatMap((r) => r.findings),
          blocked: true,
          blockFindings: result.blockFindings,
          providerModel,
          durationMs,
        };
      }
    }

    if (blocked) {
      const durationMs = Date.now() - startTime;
      logRequest({
        requestId,
        clientLabel,
        providerModel,
        originalMessages: messages,
        sanitizedMessages,
        sanitizationReport: report.flatMap((r) => r.findings),
        durationMs,
        blocked: true,
      });
      activityLog.log({
        requestId,
        userName: opts.user?.name ?? clientLabel,
        tokenPreview,
        originalMessages: messages as Array<{ role: string; content: unknown }>,
        sanitizedMessages: filterSanitizedForLog(sanitizedMessages as Array<{ role: string; content: unknown }>),
        llmResponse: null,
        providerModel,
        blocked: true,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });
      return {
        requestId,
        text: null,
        finishReason: 'content_filter',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        sanitizationReport: report.flatMap((r) => r.findings),
        blocked: true,
        blockFindings,
        providerModel,
        durationMs,
      };
    }

    const sdkTools = convertTools(rawTools);
    const sdkToolChoice = convertToolChoice(toolChoice);
    const coreMessages = convertMessagesToCore(sanitizedMessages as OpenAIMessage[]);

    const result = await generateText({
      model,
      messages: coreMessages,
      system: sanitizedSystem,
      temperature,
      maxTokens,
      ...(sdkTools ? { tools: sdkTools } : {}),
      ...(sdkToolChoice ? { toolChoice: sdkToolChoice } : {}),
    });

    const durationMs = Date.now() - startTime;
    const flatReport = report.flatMap((r) => r.findings);

    logRequest({
      requestId,
      clientLabel,
      providerModel,
      originalMessages: messages,
      sanitizedMessages,
      sanitizationReport: flatReport,
      responseTokens: result.usage?.totalTokens,
      durationMs,
    });

    activityLog.log({
      requestId,
      userName: opts.user?.name ?? clientLabel,
      tokenPreview,
      originalMessages: messages as Array<{ role: string; content: unknown }>,
      sanitizedMessages: filterSanitizedForLog(sanitizedMessages as Array<{ role: string; content: unknown }>),
      llmResponse: extractTextFromResult(result.text),
      providerModel,
      blocked: false,
      promptTokens: result.usage?.promptTokens ?? 0,
      completionTokens: result.usage?.completionTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
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
      sanitizationReport: flatReport,
      blocked: false,
      blockFindings: [],
      providerModel,
      durationMs,
    };
  }
}

export const chatService = new ChatService();
