'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import { useModels } from '@/hooks/useModels';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const QUICK_ADD = [
  { value: 'openai:gpt-4o', label: 'GPT-4o' },
  { value: 'anthropic:claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { value: 'google:gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
];

export function ModelsClient() {
  const { data: models, isLoading, mutate } = useModels();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!value.trim()) {
      toast.error("Campo 'provider:model' obrigatório");
      return;
    }
    setSaving(true);
    try {
      await apiClient.models.add({ value: value.trim(), label: label.trim() || value.trim() });
      await mutate();
      toast.success('Modelo adicionado');
      setOpen(false);
      setValue('');
      setLabel('');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiClient.models.remove(id);
      await mutate();
      toast.success('Modelo removido');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modelos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os modelos disponíveis</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Label</th>
                <th className="px-4 py-3 text-left font-medium">Provider:Model</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {models?.map((model) => (
                <tr key={model.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{model.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {model.value}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={model.active ? 'default' : 'secondary'}>
                      {model.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(model.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {models?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum modelo cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Modelo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Provider:Model *</Label>
              <Input
                placeholder="openai:gpt-4o"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Label (opcional)</Label>
              <Input
                placeholder="GPT-4o"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Adicionar rapidamente:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_ADD.map((q) => (
                  <Button
                    key={q.value}
                    variant="outline"
                    size="sm"
                    onClick={() => { setValue(q.value); setLabel(q.label); }}
                  >
                    {q.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? 'Salvando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
