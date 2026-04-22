'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Trash2 } from 'lucide-react';
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

const PAGE_SIZE = 50;

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Atividade</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico de requisições ao gateway
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filtrar por usuário..."
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-48"
          />
          <Button variant="outline" size="sm" onClick={() => revalidateActivity()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setClearAllOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar tudo
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Token</TableHead>
              <TableHead className="w-[40%]">Mensagem</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data?.rows.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  Nenhuma atividade registrada ainda.
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/activity/${row.id}`)}
                >
                  <TableCell className="font-medium">{row.user_name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {row.token_preview}...
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {row.message_preview}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.provider_model}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {row.blocked ? '—' : row.total_tokens.toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {row.blocked ? (
                      <Badge variant="destructive">bloqueado</Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">ok</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(row.id);
                    }}
                  >
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data.total} registro{data.total !== 1 ? 's' : ''} · página {page} de {totalPages}
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

      {/* Dialog: excluir registro individual */}
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

      {/* Dialog: limpar tudo */}
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
