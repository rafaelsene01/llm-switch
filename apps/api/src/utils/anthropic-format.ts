import type { OpenAIMessage, OpenAITool } from '../types';

// ── Anthropic Messages API types ────────────────────────────────────────────

export interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

export interface AnthropicToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AnthropicToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | AnthropicContentBlock[];
  is_error?: boolean;
}

export type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock;

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

export interface AnthropicToolChoice {
  type: 'auto' | 'any' | 'tool';
  name?: string;
}

export interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string;
  max_tokens: number;
  tools?: AnthropicTool[];
  tool_choice?: AnthropicToolChoice;
  temperature?: number;
  stream?: boolean;
}

// ── Request translation: Anthropic → OpenAI ─────────────────────────────────

export function messagesAnthropicToOpenAI(messages: AnthropicMessage[]): OpenAIMessage[] {
  const result: OpenAIMessage[] = [];

  for (const msg of messages) {
    const content = msg.content;

    if (msg.role === 'user') {
      if (typeof content === 'string') {
        result.push({ role: 'user', content });
        continue;
      }

      const texts: string[] = [];
      const toolResults: AnthropicToolResultBlock[] = [];

      for (const block of content) {
        if (block.type === 'text') texts.push(block.text);
        else if (block.type === 'tool_result') toolResults.push(block);
      }

      if (texts.length > 0) {
        result.push({ role: 'user', content: texts.join('\n') });
      }

      for (const tr of toolResults) {
        const trContent =
          typeof tr.content === 'string'
            ? tr.content
            : tr.content
                .filter((b): b is AnthropicTextBlock => b.type === 'text')
                .map((b) => b.text)
                .join('\n');

        result.push({ role: 'tool', content: trContent, tool_call_id: tr.tool_use_id });
      }
      continue;
    }

    if (msg.role === 'assistant') {
      if (typeof content === 'string') {
        result.push({ role: 'assistant', content });
        continue;
      }

      const texts: string[] = [];
      const toolUses: AnthropicToolUseBlock[] = [];

      for (const block of content) {
        if (block.type === 'text') texts.push(block.text);
        else if (block.type === 'tool_use') toolUses.push(block);
      }

      result.push({
        role: 'assistant',
        content: texts.join('\n') || null,
        ...(toolUses.length > 0
          ? {
              tool_calls: toolUses.map((tu) => ({
                id: tu.id,
                type: 'function' as const,
                function: { name: tu.name, arguments: JSON.stringify(tu.input) },
              })),
            }
          : {}),
      });
    }
  }

  return result;
}

export function toolsAnthropicToOpenAI(tools: AnthropicTool[]): OpenAITool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema ?? { type: 'object', properties: {} },
    },
  }));
}

export function toolChoiceAnthropicToOpenAI(
  tc?: AnthropicToolChoice
): string | { type: 'function'; function: { name: string } } | undefined {
  if (!tc) return undefined;
  if (tc.type === 'auto') return 'auto';
  if (tc.type === 'any') return 'required';
  if (tc.type === 'tool' && tc.name) return { type: 'function', function: { name: tc.name } };
  return 'auto';
}

// ── Response helpers ─────────────────────────────────────────────────────────

export function finishReasonToAnthropic(reason: string): string {
  if (reason === 'tool-calls' || reason === 'tool_calls') return 'tool_use';
  if (reason === 'length') return 'max_tokens';
  return 'end_turn';
}

export function buildAnthropicResponse(opts: {
  requestId: string;
  text: string | null;
  toolCalls?: Array<{ toolCallId: string; toolName: string; args: unknown }>;
  finishReason: string;
  usage: { promptTokens: number; completionTokens: number };
  modelId: string;
}) {
  const { requestId, text, toolCalls, finishReason, usage, modelId } = opts;

  const content: AnthropicContentBlock[] = [];
  if (text) content.push({ type: 'text', text });
  for (const tc of toolCalls ?? []) {
    content.push({
      type: 'tool_use',
      id: tc.toolCallId,
      name: tc.toolName,
      input: (typeof tc.args === 'object' && tc.args !== null ? tc.args : {}) as Record<
        string,
        unknown
      >,
    });
  }

  return {
    id: `msg_${requestId}`,
    type: 'message',
    role: 'assistant',
    model: modelId,
    content,
    stop_reason: finishReasonToAnthropic(finishReason),
    stop_sequence: null,
    usage: {
      input_tokens: usage.promptTokens,
      output_tokens: usage.completionTokens,
    },
  };
}
