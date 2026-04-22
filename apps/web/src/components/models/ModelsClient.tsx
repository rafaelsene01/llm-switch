'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, RefreshCw, Cpu } from 'lucide-react';
import { useModels } from '@/hooks/useModels';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/layout/PageHeader';

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
  const [syncing, setSyncing] = useState(false);

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

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await apiClient.models.sync();
      await mutate();
      toast.success(`Sincronizado: ${result.added} adicionados, ${result.removed} removidos`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggleActive(id: string, active: boolean) {
    try {
      await apiClient.models.update(id, { active });
      await mutate();
      toast.success(active ? 'Modelo ativado' : 'Modelo desativado');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <TooltipProvider>
      <div>
        <PageHeader
          title="Modelos"
          description="Gerencie os modelos disponíveis"
          actions={
            <>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`mr-1.5 h-4 w-4${syncing ? ' animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar'}
              </Button>
              <Button onClick={() => setOpen(true)} size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Adicionar
              </Button>
            </>
          }
        />

        {isLoading ? (
          <div className="rounded-lg border overflow-hidden">
            <div className="bg-muted/40 px-4 py-2.5 border-b">
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-8 px-4 py-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-9 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : !models?.length ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <Cpu className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium text-sm">Nenhum modelo cadastrado</p>
            <p className="mt-1 text-caption">Adicione um modelo para começar a rotear requisições</p>
            <Button onClick={() => setOpen(true)} size="sm" className="mt-4">
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar modelo
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-section-title h-10">Label</TableHead>
                  <TableHead className="text-section-title h-10">Provider:Model</TableHead>
                  <TableHead className="text-section-title h-10">Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id} className="group hover:bg-muted/30 transition-colors duration-150">
                    <TableCell className="font-medium">{model.label}</TableCell>
                    <TableCell>
                      <code className="text-caption font-mono bg-muted px-1.5 py-0.5 rounded">
                        {model.value}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={model.active}
                        onCheckedChange={(checked) => handleToggleActive(model.id, checked)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader className="border-b border-border pb-4 mb-2">
              <DialogTitle className="text-base font-semibold">Adicionar Modelo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-field-label">Provider:Model *</Label>
                <Input
                  placeholder="openai:gpt-4o"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="mt-1.5 font-mono"
                />
              </div>
              <div>
                <Label className="text-field-label">Label (opcional)</Label>
                <Input
                  placeholder="GPT-4o"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <p className="mb-2 text-caption">Adicionar rapidamente:</p>
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
            <DialogFooter className="border-t border-border pt-4 mt-2">
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
    </TooltipProvider>
  );
}
