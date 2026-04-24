'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { useModels } from '@/hooks/useModels';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserFormFields, NO_MODEL, DEFAULT_SANITIZATION_ROLES } from './UserFormFields';
import type { UserPublic, SanitizationRoles } from '@/types';

interface FormState {
  name: string;
  model: string;
  allowedModels: string[];
  sanitizationRoles: SanitizationRoles;
}

interface Props {
  user: UserPublic;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function UserActionsMenu({ user, onUpdated, onDeleted }: Props) {
  const { data: models } = useModels();
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({ name: '', model: '', allowedModels: [], sanitizationRoles: DEFAULT_SANITIZATION_ROLES });

  const activeModels = models?.filter((m) => m.active) ?? [];

  function openEdit() {
    setForm({
      name: user.name,
      model: user.model ?? '',
      allowedModels: [...user.allowedModels],
      sanitizationRoles: user.sanitizationRoles ?? DEFAULT_SANITIZATION_ROLES,
    });
    setEditOpen(true);
  }

  function handleModelChange(value: string) {
    const model = value === NO_MODEL ? '' : value;
    setForm((f) => ({
      ...f,
      model,
      allowedModels:
        model && !f.allowedModels.includes(model)
          ? [...f.allowedModels, model]
          : f.allowedModels,
    }));
  }

  function handleAllowedModelsChange(value: string, checked: boolean) {
    setForm((f) => ({
      ...f,
      allowedModels: checked
        ? [...f.allowedModels, value]
        : f.allowedModels.filter((m) => m !== value),
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Campo 'Nome' obrigatório"); return; }
    setSaving(true);
    try {
      await apiClient.users.update(user.id, {
        name: form.name,
        model: form.model || null,
        allowedModels: form.allowedModels,
        active: user.active,
        sanitizationRoles: form.sanitizationRoles,
      });
      toast.success('Usuário atualizado');
      setEditOpen(false);
      onUpdated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await apiClient.users.remove(user.id);
      toast.success('Usuário removido');
      onDeleted();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <>
      {/* Tooltip > TooltipTrigger > DropdownMenuTrigger > Button — ordem correta para Radix */}
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Ações</TooltipContent>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={openEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Tooltip>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input
                placeholder="minha-equipe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <UserFormFields
              model={form.model}
              allowedModels={form.allowedModels}
              activeModels={activeModels}
              idPrefix={`edit-${user.id}`}
              sanitizationRoles={form.sanitizationRoles}
              onModelChange={handleModelChange}
              onAllowedModelsChange={handleAllowedModelsChange}
              onSanitizationRolesChange={(roles) => setForm((f) => ({ ...f, sanitizationRoles: roles }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
