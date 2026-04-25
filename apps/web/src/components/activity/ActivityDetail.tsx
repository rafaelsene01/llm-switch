'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, AlertTriangle, ChevronDown, Shield } from 'lucide-react';
import type { ActivityLogDetail } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MessageList, tryParseMessages } from './MessageList';
import { cn } from '@/lib/utils';

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

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-section-title mb-1">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <div>
          <h1 className="text-page-title leading-none">Log de Atividade</h1>
          <p className="text-caption font-mono mt-1">{row.request_id}</p>
        </div>
        <div className="ml-auto">
          {row.blocked ? (
            <Badge variant="destructive" className="gap-1.5">
              <Shield className="h-3 w-3" />
              Bloqueado
            </Badge>
          ) : (
            <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              OK
            </Badge>
          )}
        </div>
      </div>

      {/* Metadata card */}
      <Card className="shadow-card border-border/50">
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
            <MetaField label="Usuário">
              <span className="font-medium">{row.user_name}</span>
            </MetaField>
            <MetaField label="Token">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{row.token_preview}…</code>
            </MetaField>
            <MetaField label="Modelo">
              <code className="text-xs font-mono">{row.provider_model}</code>
            </MetaField>
            <MetaField label="Tokens enviados (input)">
              <span className="tabular-nums font-medium">
                {row.blocked ? '—' : row.prompt_tokens.toLocaleString('pt-BR')}
              </span>
            </MetaField>
            <MetaField label="Tokens recebidos (output)">
              <span className="tabular-nums font-medium">
                {row.blocked ? '—' : row.completion_tokens.toLocaleString('pt-BR')}
              </span>
            </MetaField>
            <MetaField label="Total de tokens">
              <span className="tabular-nums font-medium">
                {row.blocked ? '—' : row.total_tokens.toLocaleString('pt-BR')}
              </span>
            </MetaField>
            <MetaField label="Custo entrada (input)">
              <span className="tabular-nums font-medium font-mono">
                {row.blocked || row.input_cost_usd === 0 ? '—' : `$${row.input_cost_usd.toFixed(6)}`}
              </span>
            </MetaField>
            <MetaField label="Custo saída (output)">
              <span className="tabular-nums font-medium font-mono">
                {row.blocked || row.output_cost_usd === 0 ? '—' : `$${row.output_cost_usd.toFixed(6)}`}
              </span>
            </MetaField>
            <MetaField label="Data">
              <span>{new Date(row.created_at).toLocaleString('pt-BR')}</span>
            </MetaField>
          </div>
        </CardContent>
      </Card>

      {/* Log sections */}
      {!markdown ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Arquivo de log não encontrado no servidor.
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => {
            const isCollapsed = collapsed.has(section.title);
            return (
              <Card key={section.title} className="shadow-card border-border/50 overflow-hidden">
                <CardHeader
                  className={cn(
                    'px-4 py-3 cursor-pointer select-none transition-colors duration-150',
                    isCollapsed ? 'bg-transparent' : 'bg-muted/20'
                  )}
                  onClick={() => toggle(section.title)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform duration-200',
                        isCollapsed ? '-rotate-90' : ''
                      )}
                    />
                  </div>
                </CardHeader>
                {!isCollapsed && (
                  <>
                    <Separator className="opacity-60" />
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
