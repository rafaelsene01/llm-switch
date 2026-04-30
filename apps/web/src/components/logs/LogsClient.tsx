'use client';

import { useState } from 'react';
import { RefreshCw, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { AuditLogEntry } from '@/types';

const STATUS_BADGE: Record<AuditLogEntry['message'], { label: string; className: string }> = {
  request_ok:        { label: 'OK',    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  request_sanitized: { label: 'OK',    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  request_blocked:   { label: 'Aviso', className: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' },
  request_failed:    { label: 'Erro',  className: 'border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400' },
};

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function formatTimestamp(ts: string): string {
  return ts.replace('T', ' ').slice(0, 19);
}

const LIMIT = 50;

export function LogsClient() {
  const [page, setPage] = useState(1);
  const [clientInput, setClientInput] = useState('');
  const [clientFilter, setClientFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data, isLoading, error, mutate } = useAuditLog(page, LIMIT, clientFilter, statusFilter);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  function applyClientFilter() {
    setPage(1);
    setClientFilter(clientInput.trim() || undefined);
  }

  function handleStatusChange(value: string) {
    setPage(1);
    setStatusFilter(value === 'all' ? undefined : value);
  }

  function clearFilters() {
    setClientInput('');
    setClientFilter(undefined);
    setStatusFilter(undefined);
    setPage(1);
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Logs de Auditoria</h1>
            <p className="text-sm text-muted-foreground">
              Requisições registradas em logs/audit.log
              {data ? ` — ${data.total} entradas` : ''}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-2">
            <Input
              className="h-8 w-44 text-sm"
              placeholder="Filtrar por usuário..."
              value={clientInput}
              onChange={(e) => setClientInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyClientFilter()}
            />
            <Button variant="outline" size="sm" onClick={applyClientFilter}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <Select value={statusFilter ?? 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ok">OK</SelectItem>
              <SelectItem value="warn">Aviso</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
            </SelectContent>
          </Select>

          {(clientFilter || statusFilter) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-sm">
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Erro ao carregar logs: {(error as Error).message}</span>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Timestamp</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Provider / Modelo</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-20 text-right">Tokens</TableHead>
                  <TableHead className="w-20 text-right">Duração</TableHead>
                  <TableHead className="w-32 truncate">Request ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.entries.map((entry) => {
                  const badge = STATUS_BADGE[entry.message] ?? { label: entry.message, className: '' };
                  return (
                    <TableRow key={entry.requestId}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatTimestamp(entry.timestamp)}
                      </TableCell>
                      <TableCell className="font-medium">{entry.client}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.provider}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs px-1.5 py-0 ${badge.className}`}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {entry.responseTokens ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatDuration(entry.durationMs)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[120px]" title={entry.requestId}>
                        {entry.requestId.slice(0, 8)}…
                      </TableCell>
                    </TableRow>
                  );
                })}
                {data?.entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nenhum log encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
