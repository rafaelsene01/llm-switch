'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Plus, Users } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useModels } from '@/hooks/useModels';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { NO_MODEL } from './UserFormFields';
import { ImportExportActions } from '@/components/shared/ImportExportActions';
import { PageHeader } from '@/components/layout/PageHeader';

export function UsersClient() {
  const { data: users, isLoading, mutate } = useUsers();
  const { data: models } = useModels();
  const [createOpen, setCreateOpen] = useState(false);

  const activeModels = models?.filter((m) => m.active) ?? [];

  async function handleToggle(id: string, active: boolean) {
    try {
      await apiClient.users.update(id, { active });
      await mutate();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleInlineModelChange(
    id: string,
    currentAllowedModels: string[],
    value: string,
  ) {
    const newModel = value === NO_MODEL ? null : value;
    const merged = newModel
      ? Array.from(new Set([...currentAllowedModels, newModel]))
      : currentAllowedModels;
    try {
      await apiClient.users.update(id, { model: newModel, allowedModels: merged });
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
                {['Nome', 'Key', 'Modelo padrão', 'Ativo', ''].map((h) => (
                  <Skeleton key={h} className="h-3 w-16" />
                ))}
              </div>
            </div>
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-8 px-4 py-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-48" />
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
                  <TableHead className="text-section-title h-10">Modelo padrão</TableHead>
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
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={user.model && activeModels.some(m => m.value === user.model) ? user.model : undefined}
                          onValueChange={(v) =>
                            handleInlineModelChange(user.id, user.allowedModels, v)
                          }
                        >
                          <SelectTrigger className={`h-7 w-52 text-xs${!user.model || !activeModels.some(m => m.value === user.model) ? ' border-destructive' : ''}`}>
                            <SelectValue placeholder="Selecione um modelo" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeModels.map((m) => (
                              <SelectItem key={m.id} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {user.model && !activeModels.some(m => m.value === user.model) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>Modelo &quot;{user.model}&quot; não encontrado</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
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
