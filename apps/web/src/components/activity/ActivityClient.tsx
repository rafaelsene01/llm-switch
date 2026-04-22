'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { useActivity } from '@/hooks/useActivity';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  const { data, isLoading, mutate } = useActivity(page, PAGE_SIZE);
  const router = useRouter();

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Atividade</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico de requisições ao gateway
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data?.rows.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
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
    </div>
  );
}
