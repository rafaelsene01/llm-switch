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
import { UserFormFields, NO_MODEL, DEFAULT_SANITIZATION_ROLES } from './UserFormFields';
import type { SanitizationRoles } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface FormState {
  name: string;
  key: string;
  model: string;
  allowedModels: string[];
  sanitizationRoles: SanitizationRoles;
}

const emptyForm: FormState = { name: '', key: '', model: '', allowedModels: [], sanitizationRoles: DEFAULT_SANITIZATION_ROLES };

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
        model: form.model || null,
        allowedModels: form.allowedModels,
        sanitizationRoles: form.sanitizationRoles,
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
      <DialogContent>
        <DialogHeader className="border-b border-border pb-4 mb-2">
          <DialogTitle className="text-base font-semibold">Criar Usuário</DialogTitle>
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
          <div>
            <Label className="text-field-label">API Key *</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                placeholder="gw_..."
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
          <UserFormFields
            model={form.model}
            allowedModels={form.allowedModels}
            activeModels={activeModels}
            idPrefix="create"
            sanitizationRoles={form.sanitizationRoles}
            onModelChange={handleModelChange}
            onAllowedModelsChange={handleAllowedModelsChange}
            onSanitizationRolesChange={(roles) => setForm((f) => ({ ...f, sanitizationRoles: roles }))}
          />
        </div>
        <DialogFooter className="border-t border-border pt-4 mt-2">
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Criando...' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
