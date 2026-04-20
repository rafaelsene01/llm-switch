'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MoreHorizontal, Trash2, Pencil } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { BlocklistEntry, BlocklistMode, BlocklistCategory } from '@/types';

interface Props {
  rule: BlocklistEntry;
  onUpdated: () => void;
  onDeleted: () => void;
}

type FormState = Pick<BlocklistEntry, 'label' | 'value' | 'type' | 'replacement' | 'category' | 'mode'>;

export function RuleActionsMenu({ rule, onUpdated, onDeleted }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    label: '',
    value: '',
    type: 'word',
    replacement: '[REMOVIDO]',
    category: 'custom',
    mode: 'redact',
  });

  function openEdit() {
    setForm({
      label: rule.label,
      value: rule.value,
      type: rule.type,
      replacement: rule.replacement,
      category: rule.category,
      mode: rule.mode,
    });
    setEditOpen(true);
  }

  async function handleSave() {
    if (!form.value.trim()) {
      toast.error("Campo 'Padrão' obrigatório");
      return;
    }
    setSaving(true);
    try {
      await apiClient.blocklist.update(rule.id, { ...form, value: form.value.trim() });
      toast.success('Regra atualizada');
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
      await apiClient.blocklist.remove(rule.id);
      toast.success('Regra removida');
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
      </Tooltip >

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Regra</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Label</Label>
              <Input
                placeholder="Minha Regra"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Padrão *</Label>
              <Input
                placeholder="palavra ou regex"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="mt-1.5 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as 'word' | 'regex' })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="word">Palavra</SelectItem>
                    <SelectItem value="regex">Regex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modo</Label>
                <Select
                  value={form.mode}
                  onValueChange={(v) => setForm({ ...form, mode: v as BlocklistMode })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">Desativado</SelectItem>
                    <SelectItem value="redact">Redact</SelectItem>
                    <SelectItem value="block">Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v as BlocklistCategory })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="documento">Documento</SelectItem>
                  <SelectItem value="contato">Contato</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="credencial">Credencial</SelectItem>
                  <SelectItem value="saude">Saúde</SelectItem>
                  <SelectItem value="rede">Rede</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Substituição</Label>
              <Input
                placeholder="[REMOVIDO]"
                value={form.replacement}
                onChange={(e) => setForm({ ...form, replacement: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
