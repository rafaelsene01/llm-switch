'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Users } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useModels } from '@/hooks/useModels';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserActionsMenu } from './UserActionsMenu';
import { CreateUserDialog } from './CreateUserDialog';
import { ImportExportActions } from '@/components/shared/ImportExportActions';
import { PageHeader } from '@/components/layout/PageHeader';
import type { GatewayModel } from '@/types';

function ModelsSummary({ allowedModels, modelMap }: { allowedModels: string[]; modelMap: Map<string, GatewayModel> }) {
  if (allowedModels.length === 0) {
    return <span className="text-xs text-muted-foreground/50 italic">nenhum</span>;
  }

  const first = modelMap.get(allowedModels[0]);
  const firstName = first?.label ?? allowedModels[0];
  const rest = allowedModels.length - 1;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-sm cursor-default">
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{firstName}</span>
          {rest > 0 && (
            <span className="ml-1.5 text-xs text-muted-foreground">+{rest}</span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs font-medium mb-1">Fila de prioridade:</p>
        <ol className="text-xs space-y-0.5 list-none">
          {allowedModels.map((v, i) => (
            <li key={v}>
              <span className="text-muted-foreground mr-1">{i + 1}.</span>
              {modelMap.get(v)?.label ?? v}
            </li>
          ))}
        </ol>
      </TooltipContent>
    </Tooltip>
  );
}

export function UsersClient() {
  const { data: users, isLoading, mutate } = useUsers();
  const { data: models } = useModels();
  const [createOpen, setCreateOpen] = useState(false);

  const modelMap = new Map((models ?? []).map((m) => [m.value, m]));

  async function handleToggle(id: string, active: boolean) {
    try {
      await apiClient.users.update(id, { active });
      await mutate();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <TooltipProvider>
      <div>
        <PageHeader
          title="Usuários"
          description="Gerencie usuários e API keys"
          actions={
            <>
              <ImportExportActions module="users" onImportSuccess={mutate} />
              <Button onClick={() => setCreateOpen(true)} size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Criar
              </Button>
            </>
          }
        />

        {isLoading ? (
          <div className="rounded-lg border overflow-hidden">
            <div className="bg-muted/40 px-4 py-2.5 border-b">
              <div className="flex gap-8">
                {['Nome', 'Key', 'Modelos', 'Ativo', ''].map((h) => (
                  <Skeleton key={h} className="h-3 w-16" />
                ))}
              </div>
            </div>
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-8 px-4 py-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-9 rounded-full" />
                  <Skeleton className="h-4 w-4 ml-auto" />
                </div>
              ))}
            </div>
          </div>
        ) : !users?.length ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium text-sm">Nenhum usuário cadastrado</p>
            <p className="mt-1 text-caption">Crie o primeiro usuário para começar</p>
            <Button onClick={() => setCreateOpen(true)} size="sm" className="mt-4">
              <Plus className="mr-1.5 h-4 w-4" />
              Criar usuário
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-section-title h-10">Nome</TableHead>
                  <TableHead className="text-section-title h-10">Key</TableHead>
                  <TableHead className="text-section-title h-10">Modelos (prioridade)</TableHead>
                  <TableHead className="text-section-title h-10">Ativo</TableHead>
                  <TableHead className="h-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors duration-150">
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>
                      <code className="text-caption font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
                        {user.keyPreview}
                      </code>
                    </TableCell>
                    <TableCell>
                      <ModelsSummary allowedModels={user.allowedModels} modelMap={modelMap} />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.active}
                        onCheckedChange={(checked) => handleToggle(user.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <UserActionsMenu
                        user={user}
                        onUpdated={mutate}
                        onDeleted={mutate}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <CreateUserDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={mutate}
        />
      </div>
    </TooltipProvider>
  );
}
