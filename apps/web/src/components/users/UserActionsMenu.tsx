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
import { ModelPriorityList } from './ModelPriorityList';
import type { UserPublic } from '@/types';

interface FormState {
  name: string;
  allowedModels: string[];
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
  const [form, setForm] = useState<FormState>({ name: '', allowedModels: [] });

  const activeModels = models?.filter((m) => m.active) ?? [];

  function openEdit() {
    setForm({
      name: user.name,
      allowedModels: [...user.allowedModels],
    });
    setEditOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Campo 'Nome' obrigatório"); return; }
    setSaving(true);
    try {
      await apiClient.users.update(user.id, {
        name: form.name,
        model: null,
        allowedModels: form.allowedModels,
        active: user.active,
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-4 mb-2">
            <DialogTitle className="text-base font-semibold">Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-field-label">Nome *</Label>
              <Input
                placeholder="minha-equipe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <ModelPriorityList
              allowedModels={form.allowedModels}
              activeModels={activeModels}
              onChange={(models) => setForm((f) => ({ ...f, allowedModels: models }))}
            />
          </div>
          <DialogFooter className="border-t border-border pt-4 mt-2">
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
