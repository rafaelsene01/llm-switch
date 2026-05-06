'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, RefreshCw } from 'lucide-react';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ModelPriorityList } from './ModelPriorityList';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface FormState {
  name: string;
  key: string;
  allowedModels: string[];
}

const emptyForm: FormState = { name: '', key: '', allowedModels: [] };

export function CreateUserDialog({ open, onOpenChange, onCreated }: Props) {
  const { data: models } = useModels();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const activeModels = models?.filter((m) => m.active) ?? [];

  async function generateKey() {
    try {
      const { key } = await apiClient.users.generateKey();
      setForm((f) => ({ ...f, key }));
    } catch {
      toast.error('Erro ao gerar chave');
    }
  }

  function handleClose() {
    setForm(emptyForm);
    onOpenChange(false);
  }

  async function handleCreate() {
    if (!form.name.trim()) { toast.error("Campo 'Nome' obrigatório"); return; }
    if (!form.key.trim()) { toast.error("Campo 'API Key' obrigatório"); return; }
    setSaving(true);
    try {
      await apiClient.users.add({
        name: form.name,
        key: form.key,
        model: null,
        allowedModels: form.allowedModels,
      });
      toast.success('Usuário criado');
      onCreated();
      handleClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex flex-col max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-base font-semibold">Criar Usuário</DialogTitle>
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
            <Label className="text-field-label">API Key *</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                placeholder="sk-..."
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                className="font-mono"
              />
              {form.key && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(form.key);
                        toast.success('Chave copiada');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copiar chave</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={generateKey}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Gerar chave</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <ModelPriorityList
            allowedModels={form.allowedModels}
            activeModels={activeModels}
            onChange={(models) => setForm((f) => ({ ...f, allowedModels: models }))}
          />
        </div>
        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Criando...' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
