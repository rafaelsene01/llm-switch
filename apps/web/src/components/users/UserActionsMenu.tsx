'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MoreHorizontal, Trash2, Pencil, RefreshCw, Copy, Check } from 'lucide-react';
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
  newKey: string | null;
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
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<FormState>({ name: '', allowedModels: [], newKey: null });

  const activeModels = models?.filter((m) => m.active) ?? [];

  function openEdit() {
    setForm({ name: user.name, allowedModels: [...user.allowedModels], newKey: null });
    setCopied(false);
    setEditOpen(true);
  }

  async function handleGenerateKey() {
    setGeneratingKey(true);
    try {
      const { key } = await apiClient.users.generateKey();
      setForm((f) => ({ ...f, newKey: key }));
      setCopied(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGeneratingKey(false);
    }
  }

  async function handleCopy() {
    if (!form.newKey) return;
    await navigator.clipboard.writeText(form.newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        ...(form.newKey ? { key: form.newKey } : {}),
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
        <DialogContent className="flex flex-col max-h-[90vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-base font-semibold">Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <Label className="text-field-label">Nome *</Label>
              <Input
                placeholder="minha-equipe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-field-label">API Key</Label>
              <div className="mt-1.5 space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-muted px-3 py-2 rounded border border-border text-muted-foreground truncate">
                    {form.newKey ?? user.keyPreview}
                  </code>
                  {form.newKey && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={handleCopy}
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateKey}
                  disabled={generatingKey}
                  className="w-full"
                >
                  <RefreshCw className={`mr-2 h-3.5 w-3.5 ${generatingKey ? 'animate-spin' : ''}`} />
                  {generatingKey ? 'Gerando...' : 'Gerar novo token'}
                </Button>
                {form.newKey && (
                  <p className="text-xs text-amber-500">
                    Copie o token agora — ele não será exibido novamente após salvar.
                  </p>
                )}
              </div>
            </div>
            <ModelPriorityList
              allowedModels={form.allowedModels}
              activeModels={activeModels}
              onChange={(models) => setForm((f) => ({ ...f, allowedModels: models }))}
            />
          </div>
          <DialogFooter className="px-6 py-4 border-t shrink-0">
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
