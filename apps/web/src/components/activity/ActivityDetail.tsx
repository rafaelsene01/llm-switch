'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, AlertTriangle, ChevronDown } from 'lucide-react';
import type { ActivityLogDetail } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MessageList, tryParseMessages } from './MessageList';

interface Props {
  detail: ActivityLogDetail;
}

const SECTION_TITLES: Record<string, string> = {
  'Original Request': 'Original Request',
  'Sanitized Request': 'Sanitized Request',
  'LLM Response': 'LLM Response',
};

const REQUEST_SECTIONS = new Set(['Original Request', 'Sanitized Request']);

function extractLlmText(content: string): string {
  const trimmed = content.trim();
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
      // not JSON — fall through
    }
  }
  return content;
}

function parseSections(markdown: string): Array<{ title: string; content: string }> {
  const parts = markdown.split(/^## /m);
  return parts
    .slice(1)
    .map((part) => {
      const newline = part.indexOf('\n');
      const title = newline === -1 ? part.trim() : part.slice(0, newline).trim();
      const content = newline === -1 ? '' : part.slice(newline + 1).trim();
      return { title, content };
    })
    .filter((s) => s.title in SECTION_TITLES);
}

export function ActivityDetail({ detail }: Props) {
  const router = useRouter();
  const { row, markdown } = detail;
  const sections = markdown ? parseSections(markdown) : [];
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(title: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <div>
          <h1 className="text-xl font-semibold leading-none">Log de Atividade</h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">{row.request_id}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Usuário</p>
              <p className="text-sm font-medium">{row.user_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Token</p>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.token_preview}...</code>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Modelo</p>
              <p className="text-sm">{row.provider_model}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Tokens</p>
              <p className="text-sm tabular-nums">
                {row.blocked ? '—' : row.total_tokens.toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Status</p>
              {row.blocked ? (
                <Badge variant="destructive">bloqueado</Badge>
              ) : (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">ok</Badge>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Data</p>
              <p className="text-sm">{new Date(row.created_at).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!markdown ? (
        <div className="flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 p-4 text-sm text-yellow-800 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Arquivo de log não encontrado no servidor.
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const isCollapsed = collapsed.has(section.title);
            return (
              <Card key={section.title}>
                <CardHeader
                  className="p-3 cursor-pointer select-none"
                  onClick={() => toggle(section.title)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                    />
                  </div>
                </CardHeader>
                {!isCollapsed && (
                  <>
                    <Separator />
                    <CardContent className="pt-4">
                      {REQUEST_SECTIONS.has(section.title) ? (
                        (() => {
                          const messages = tryParseMessages(section.content);
                          return messages ? (
                            <MessageList messages={messages} />
                          ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none
                              prose-pre:bg-muted prose-pre:text-sm prose-pre:rounded-md
                              prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:rounded">
                              <ReactMarkdown>{section.content}</ReactMarkdown>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none
                          prose-pre:bg-muted prose-pre:text-sm prose-pre:rounded-md
                          prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:rounded">
                          <ReactMarkdown>{extractLlmText(section.content)}</ReactMarkdown>
                        </div>
                      )}
                    </CardContent>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
