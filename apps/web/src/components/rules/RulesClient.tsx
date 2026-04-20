'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
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
import { RuleActionsMenu } from './RuleActionsMenu';
import type { BlocklistMode, BlocklistCategory } from '@/types';

const MODE_LABELS: Record<BlocklistMode, string> = {
  disabled: 'Desativado',
  redact: 'Redact',
  block: 'Block',
};

const MODE_VARIANTS: Record<BlocklistMode, 'secondary' | 'outline' | 'destructive'> = {
  disabled: 'secondary',
  redact: 'outline',
  block: 'destructive',
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Regras de Sanitização</h1>
            <p className="text-sm text-muted-foreground">Gerencie regras de detecção de PII</p>
          </div>
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Adicionar
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules?.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rule.label}</span>
                        {rule.builtin && (
                          <Badge variant="secondary" className="text-xs">
                            built-in
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{rule.category}</TableCell>
                    <TableCell>
                      <code className="text-xs">{rule.type}</code>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={rule.mode}
                        onValueChange={(v) => handleModeChange(rule.id, v as BlocklistMode)}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
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
                    <TableCell className="text-right">
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
            <DialogHeader>
              <DialogTitle>Adicionar Regra</DialogTitle>
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
