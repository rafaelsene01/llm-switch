'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
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
import { TooltipProvider } from '@/components/ui/tooltip';
import { UserActionsMenu } from './UserActionsMenu';
import { CreateUserDialog } from './CreateUserDialog';
import { NO_MODEL } from './UserFormFields';

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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Usuários</h1>
            <p className="text-sm text-muted-foreground">Gerencie usuários e API keys</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Criar
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Modelo padrão</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {user.keyPreview}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.model ?? NO_MODEL}
                        onValueChange={(v) =>
                          handleInlineModelChange(user.id, user.allowedModels, v)
                        }
                      >
                        <SelectTrigger className="h-7 w-52 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_MODEL}>
                            <span className="text-muted-foreground">padrão do servidor</span>
                          </SelectItem>
                          {activeModels.map((m) => (
                            <SelectItem key={m.id} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.active}
                        onCheckedChange={(checked) => handleToggle(user.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <UserActionsMenu
                        user={user}
                        onUpdated={mutate}
                        onDeleted={mutate}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {users?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhum usuário cadastrado
                    </TableCell>
                  </TableRow>
                )}
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
