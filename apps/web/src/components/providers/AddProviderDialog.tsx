'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import type { GatewayProvider } from '@/types';
import { cn } from '@/lib/utils';

const PROVIDER_OPTIONS = [
  {
    type: 'openrouter',
    label: 'OpenRouter',
    description: 'Acesse centenas de modelos via uma única API key.',
    icon: 'OR',
    iconColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  },
  {
    type: 'ollama',
    label: 'Ollama',
    description: 'Execute modelos localmente com Ollama.',
    icon: 'OLL',
    iconColor: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
  },
  {
    type: 'lmstudio',
    label: 'LM Studio',
    description: 'Conecte ao LM Studio rodando localmente.',
    icon: 'LMS',
    iconColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  },
] as const;

interface AddProviderDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: (provider: GatewayProvider) => void;
}

export function AddProviderDialog({ open, onClose, onAdded }: AddProviderDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!selected) return;
    setLoading(true);
    try {
      const provider = await apiClient.providers.create(selected, label.trim() || undefined);
      toast.success(`${provider.name} adicionado.`);
      onAdded(provider);
      onClose();
      setSelected(null);
      setLabel('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar provider.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setSelected(null);
    setLabel('');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="border-b border-border pb-4 mb-2">
          <DialogTitle className="text-base font-semibold">Adicionar provider</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-1">
          {PROVIDER_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => setSelected(opt.type)}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
                selected === opt.type
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-border/80 hover:bg-muted/40'
              )}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold ${opt.iconColor}`}>
                {opt.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-none">{opt.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="provider-label" className="text-xs text-muted-foreground">
            Label <span className="text-muted-foreground/60">(opcional)</span>
          </Label>
          <Input
            id="provider-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ex: Conta pessoal, Empresa, Projeto X..."
            className="h-8 text-sm"
            disabled={loading}
          />
        </div>

        <div className="flex gap-2 pt-2 border-t border-border mt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!selected || loading}
            className="flex-1"
          >
            <Plus className="mr-1 h-4 w-4" />
            {loading ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
