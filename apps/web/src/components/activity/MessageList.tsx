'use client';

import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface Message {
  role: string;
  content: string | null;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface MessageListProps {
  messages: Message[];
}

const ROLE_STYLES: Record<string, string> = {
  user: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  assistant: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  system: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  tool: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

function formatArguments(argsString: string): string {
  try {
    return JSON.stringify(JSON.parse(argsString), null, 2);
  } catch {
    return argsString;
  }
}

// Tool content is often a JSON-encoded array like [{"output":"..."}] or [{"type":"text","text":"..."}]
// Extract readable text from it instead of showing raw JSON.
function resolveToolContent(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return content;
    const parts: string[] = parsed.map((item) => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        // Common shapes: { output }, { text }, { content }, { result }
        const value = item.output ?? item.text ?? item.content ?? item.result;
        if (value !== undefined) return String(value);
        // Fallback: pretty-print the object
        return JSON.stringify(item, null, 2);
      }
      return String(item);
    });
    return parts.join('\n\n');
  } catch {
    return content;
  }
}

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_STYLES[role] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {role}
    </span>
  );
}

function MessageItem({ message }: { message: Message }) {
  const hasContent = message.content !== null && message.content !== '';
  const hasToolCalls = message.tool_calls && message.tool_calls.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <RoleBadge role={message.role} />
        {message.role === 'tool' && message.name && (
          <span className="text-xs font-mono text-muted-foreground">· {message.name}</span>
        )}
        {message.tool_call_id && (
          <span className="text-xs font-mono text-muted-foreground opacity-60">
            id:{message.tool_call_id}
          </span>
        )}
      </div>

      {hasContent && (
        <div className="pl-1 prose prose-sm dark:prose-invert max-w-none
          prose-pre:bg-muted prose-pre:text-sm prose-pre:rounded-md
          prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:rounded
          prose-p:my-1 prose-p:leading-relaxed">
          <ReactMarkdown>
            {message.role === 'tool' ? resolveToolContent(message.content!) : message.content!}
          </ReactMarkdown>
        </div>
      )}

      {hasToolCalls && (
        <div className="pl-1 space-y-2">
          {message.tool_calls!.map((tc) => (
            <div
              key={tc.id}
              className="rounded-md border border-border bg-muted/50 overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted border-b border-border">
                <span className="text-xs font-semibold text-foreground font-mono">
                  {tc.function.name}
                </span>
                <span className="text-xs text-muted-foreground opacity-60">· {tc.id}</span>
              </div>
              <pre className="text-xs font-mono px-3 py-2 overflow-x-auto leading-relaxed text-foreground">
                {formatArguments(tc.function.arguments)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MessageList({ messages }: MessageListProps) {
  if (!messages.length) {
    return <p className="text-xs text-muted-foreground italic">Nenhuma mensagem.</p>;
  }

  return (
    <div className="space-y-0">
      {messages.map((message, index) => (
        <div key={index}>
          <div className="py-3">
            <MessageItem message={message} />
          </div>
          {index < messages.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}

export function tryParseMessages(content: string): Message[] | null {
  const match = content.match(/^```json\n([\s\S]*?)\n```$/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) return null;
    return parsed as Message[];
  } catch {
    return null;
  }
}
