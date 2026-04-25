'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Trash2, Activity } from 'lucide-react';
import { useSWRConfig } from 'swr';
import { useActivity } from '@/hooks/useActivity';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

function StatusDot({ blocked }: { blocked: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-2 w-2 rounded-full shrink-0',
        blocked ? 'bg-destructive' : 'bg-emerald-500'
      )}
    />
  );
}

export function ActivityClient() {
  const [page, setPage] = useState(1);
  const [userFilter, setUserFilter] = useState('');
  const [debouncedUser, setDebouncedUser] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);

  const { data, isLoading, mutate } = useActivity(page, PAGE_SIZE, debouncedUser);
  const { mutate: globalMutate } = useSWRConfig();
  const router = useRouter();

  function revalidateActivity() {
    globalMutate((key: unknown) => typeof key === 'string' && key.startsWith('/admin/activity'));
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedUser(userFilter);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [userFilter]);

  async function handleDelete(id: number) {
    await apiClient.activity.remove(id);
    setDeletingId(null);
    revalidateActivity();
  }

  async function handleClearAll() {
    await apiClient.activity.removeAll();
    setClearAllOpen(false);
    revalidateActivity();
  }

  return (
    <div>
      <PageHeader
        title="Atividade"
        description="Histórico de requisições ao gateway"
        actions={
          <>
            <Input
              placeholder="Filtrar por usuário..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-44 h-8 text-sm"
            />
            <Button variant="outline" size="sm" onClick={() => revalidateActivity()}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearAllOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Limpar tudo
            </Button>
          </>
        }
      />

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-section-title h-10 w-6" />
              <TableHead className="text-section-title h-10">Usuário</TableHead>
              <TableHead className="text-section-title h-10">Token</TableHead>
              <TableHead className="text-section-title h-10 w-[35%]">Mensagem</TableHead>
              <TableHead className="text-section-title h-10">Modelo</TableHead>
              <TableHead className="text-section-title h-10">Tokens</TableHead>
              <TableHead className="text-section-title h-10">Custo</TableHead>
              <TableHead className="text-section-title h-10">Status</TableHead>
              <TableHead className="text-section-title h-10">Data</TableHead>
              <TableHead className="h-10 w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-3.5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data?.rows.length ? (
              <TableRow>
                <TableCell colSpan={10}>
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Activity className="mb-3 h-10 w-10 text-muted-foreground/30" />
                    <p className="font-medium text-sm">Nenhuma atividade registrada</p>
                    <p className="mt-1 text-caption">As requisições aparecerão aqui conforme chegarem</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="group cursor-pointer hover:bg-muted/30 transition-colors duration-150"
                  onClick={() => router.push(`/activity/${row.id}`)}
                >
                  <TableCell className="pr-0">
                    <StatusDot blocked={row.blocked} />
                  </TableCell>
                  <TableCell className="font-medium">{row.user_name}</TableCell>
                  <TableCell>
                    <code className="text-caption font-mono bg-muted px-1.5 py-0.5 rounded">
                      {row.token_preview}…
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {row.message_preview}
                  </TableCell>
                  <TableCell className="text-caption font-mono">
                    {row.provider_model}
                  </TableCell>
                  <TableCell className="text-caption tabular-nums">
                    {row.blocked ? '—' : row.total_tokens.toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-caption tabular-nums font-mono">
                    {row.blocked || row.cost_usd === 0
                      ? '—'
                      : `$${row.cost_usd.toFixed(4)}`}
                  </TableCell>
                  <TableCell>
                    {row.blocked ? (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0">bloqueado</Badge>
                    ) : (
                      <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs px-1.5 py-0">ok</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-caption whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(row.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  >
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-caption">
          <span>
            {data.total.toLocaleString('pt-BR')} registro{data.total !== 1 ? 's' : ''} · página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Este registro será removido permanentemente e não poderá ser recuperado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId !== null && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todas as atividades?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá remover <strong>todas</strong> as atividades permanentemente, incluindo os arquivos de log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Limpar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
