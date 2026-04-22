'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, ShieldCheck } from 'lucide-react';
import { useRules } from '@/hooks/useRules';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RuleActionsMenu } from './RuleActionsMenu';
import { ImportExportActions } from '@/components/shared/ImportExportActions';
import { PageHeader } from '@/components/layout/PageHeader';
import type { BlocklistMode, BlocklistCategory } from '@/types';

const MODE_LABELS: Record<BlocklistMode, string> = {
  disabled: 'Desativado',
  redact: 'Substituir',
  block: 'Bloquear',
};

const MODE_TRIGGER_CLASSES: Record<BlocklistMode, string> = {
  disabled: 'border-muted-foreground/30 text-muted-foreground',
  redact: 'border-amber-500/60 text-amber-500 bg-amber-500/10',
  block: 'border-destructive/60 text-destructive bg-destructive/10',
};

export function RulesClient() {
  const { data: rules, isLoading, mutate } = useRules();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    label: '',
    value: '',
    type: 'word' as 'word' | 'regex',
    replacement: '[REMOVIDO]',
    category: 'custom' as BlocklistCategory,
    mode: 'redact' as BlocklistMode,
  });

  async function handleModeChange(id: string, mode: BlocklistMode) {
    try {
      await apiClient.blocklist.update(id, { mode });
      await mutate();
      toast.success('Modo atualizado');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleAdd() {
    if (!form.value.trim()) {
      toast.error("Campo 'Padrão' obrigatório");
      return;
    }
    setSaving(true);
    try {
      await apiClient.blocklist.add({ ...form, value: form.value.trim() });
      await mutate();
      toast.success('Regra adicionada');
      setOpen(false);
      setForm({ label: '', value: '', type: 'word', replacement: '[REMOVIDO]', category: 'custom' as BlocklistCategory, mode: 'redact' as BlocklistMode });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <TooltipProvider>
      <div>
        <PageHeader
          title="Regras de Sanitização"
          description="Gerencie regras de detecção de PII"
          actions={
            <>
              <ImportExportActions module="blocklist" onImportSuccess={mutate} />
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
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-8 px-4 py-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-4 w-4 ml-auto" />
                </div>
              ))}
            </div>
          </div>
        ) : !rules?.length ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <ShieldCheck className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium text-sm">Nenhuma regra cadastrada</p>
            <p className="mt-1 text-caption">Adicione regras para detectar e sanitizar PII</p>
            <Button onClick={() => setOpen(true)} size="sm" className="mt-4">
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar regra
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-section-title h-10">Label</TableHead>
                  <TableHead className="text-section-title h-10">Categoria</TableHead>
                  <TableHead className="text-section-title h-10">Tipo</TableHead>
                  <TableHead className="text-section-title h-10">Modo</TableHead>
                  <TableHead className="h-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id} className="group hover:bg-muted/30 transition-colors duration-150">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rule.label}</span>
                        {rule.builtin && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            built-in
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-caption">{rule.category}</TableCell>
                    <TableCell>
                      <code className="text-caption font-mono bg-muted px-1.5 py-0.5 rounded">{rule.type}</code>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={rule.mode}
                        onValueChange={(v) => handleModeChange(rule.id, v as BlocklistMode)}
                      >
                        <SelectTrigger className={cn('h-7 w-28 text-xs', MODE_TRIGGER_CLASSES[rule.mode])}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(MODE_LABELS) as BlocklistMode[]).map((m) => (
                            <SelectItem key={m} value={m} className="text-xs">
                              {MODE_LABELS[m]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <RuleActionsMenu
                        rule={rule}
                        onUpdated={mutate}
                        onDeleted={mutate}
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
              <DialogTitle className="text-base font-semibold">Adicionar Regra</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-field-label">Label</Label>
                <Input
                  placeholder="Minha Regra"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-field-label">Padrão *</Label>
                <Input
                  placeholder="palavra ou regex"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className="mt-1.5 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-field-label">Tipo</Label>
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
                  <Label className="text-field-label">Modo</Label>
                  <Select
                    value={form.mode}
                    onValueChange={(v) => setForm({ ...form, mode: v as BlocklistMode })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disabled">Desativado</SelectItem>
                      <SelectItem value="redact">Substituir</SelectItem>
                      <SelectItem value="block">Bloquear</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-field-label">Substituição</Label>
                <Input
                  placeholder="[REMOVIDO]"
                  value={form.replacement}
                  onChange={(e) => setForm({ ...form, replacement: e.target.value })}
                  className="mt-1.5"
                />
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
