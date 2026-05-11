'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { RefreshCw, Cpu, TrendingDown, Pencil, Check, X, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useModels } from '@/hooks/useModels';
import { useProviders } from '@/hooks/useProviders';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { TooltipProvider } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import type { GatewayModel } from '@/types';

interface ProviderColors {
  chipActive: string;
  chipInactive: string;
  providerText: string;
  row: string;
}

const PROVIDER_COLOR_MAP: Record<string, ProviderColors> = {
  openai: { chipActive: 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600', chipInactive: 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20', providerText: 'text-emerald-500', row: 'bg-emerald-500/[0.04]' },
  anthropic: { chipActive: 'bg-orange-500 border-orange-500 text-white hover:bg-orange-600', chipInactive: 'border-orange-500/40 text-orange-500 bg-orange-500/10 hover:bg-orange-500/20', providerText: 'text-orange-500', row: 'bg-orange-500/[0.04]' },
  google: { chipActive: 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600', chipInactive: 'border-blue-500/40 text-blue-500 bg-blue-500/10 hover:bg-blue-500/20', providerText: 'text-blue-500', row: 'bg-blue-500/[0.04]' },
  mistral: { chipActive: 'bg-violet-500 border-violet-500 text-white hover:bg-violet-600', chipInactive: 'border-violet-500/40 text-violet-500 bg-violet-500/10 hover:bg-violet-500/20', providerText: 'text-violet-500', row: 'bg-violet-500/[0.04]' },
  cohere: { chipActive: 'bg-teal-500 border-teal-500 text-white hover:bg-teal-600', chipInactive: 'border-teal-500/40 text-teal-500 bg-teal-500/10 hover:bg-teal-500/20', providerText: 'text-teal-500', row: 'bg-teal-500/[0.04]' },
  meta: { chipActive: 'bg-indigo-500 border-indigo-500 text-white hover:bg-indigo-600', chipInactive: 'border-indigo-500/40 text-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20', providerText: 'text-indigo-500', row: 'bg-indigo-500/[0.04]' },
  groq: { chipActive: 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600', chipInactive: 'border-amber-500/40 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20', providerText: 'text-amber-500', row: 'bg-amber-500/[0.04]' },
  bedrock: { chipActive: 'bg-rose-500 border-rose-500 text-white hover:bg-rose-600', chipInactive: 'border-rose-500/40 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20', providerText: 'text-rose-500', row: 'bg-rose-500/[0.04]' },
  azure: { chipActive: 'bg-sky-500 border-sky-500 text-white hover:bg-sky-600', chipInactive: 'border-sky-500/40 text-sky-500 bg-sky-500/10 hover:bg-sky-500/20', providerText: 'text-sky-500', row: 'bg-sky-500/[0.04]' },
  ollama: { chipActive: 'bg-slate-500 border-slate-500 text-white hover:bg-slate-600', chipInactive: 'border-slate-400/40 text-slate-400 bg-slate-500/10 hover:bg-slate-500/20', providerText: 'text-slate-400', row: 'bg-slate-500/[0.04]' },
  openrouter: { chipActive: 'bg-purple-500 border-purple-500 text-white hover:bg-purple-600', chipInactive: 'border-purple-500/40 text-purple-500 bg-purple-500/10 hover:bg-purple-500/20', providerText: 'text-purple-500', row: 'bg-purple-500/[0.04]' },
  lmstudio: { chipActive: 'bg-pink-500 border-pink-500 text-white hover:bg-pink-600', chipInactive: 'border-pink-500/40 text-pink-500 bg-pink-500/10 hover:bg-pink-500/20', providerText: 'text-pink-500', row: 'bg-pink-500/[0.04]' },
};

const FALLBACK_PALETTE: ProviderColors[] = [
  { chipActive: 'bg-pink-500 border-pink-500 text-white hover:bg-pink-600', chipInactive: 'border-pink-500/40 text-pink-500 bg-pink-500/10 hover:bg-pink-500/20', providerText: 'text-pink-500', row: 'bg-pink-500/[0.04]' },
  { chipActive: 'bg-cyan-500 border-cyan-500 text-white hover:bg-cyan-600', chipInactive: 'border-cyan-500/40 text-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20', providerText: 'text-cyan-500', row: 'bg-cyan-500/[0.04]' },
  { chipActive: 'bg-lime-500 border-lime-500 text-white hover:bg-lime-600', chipInactive: 'border-lime-500/40 text-lime-500 bg-lime-500/10 hover:bg-lime-500/20', providerText: 'text-lime-500', row: 'bg-lime-500/[0.04]' },
  { chipActive: 'bg-fuchsia-500 border-fuchsia-500 text-white hover:bg-fuchsia-600', chipInactive: 'border-fuchsia-500/40 text-fuchsia-500 bg-fuchsia-500/10 hover:bg-fuchsia-500/20', providerText: 'text-fuchsia-500', row: 'bg-fuchsia-500/[0.04]' },
  { chipActive: 'bg-red-500 border-red-500 text-white hover:bg-red-600', chipInactive: 'border-red-500/40 text-red-500 bg-red-500/10 hover:bg-red-500/20', providerText: 'text-red-500', row: 'bg-red-500/[0.04]' },
];

function getProviderColors(provider: string, fallbackIndex: number): ProviderColors {
  return PROVIDER_COLOR_MAP[provider] ?? FALLBACK_PALETTE[fallbackIndex % FALLBACK_PALETTE.length];
}

function CostCell({ value }: { value?: number }) {
  if (value === undefined || value === null) {
    return <span className="text-xs text-muted-foreground/50 italic">não definido</span>;
  }
  if (value === 0) {
    return <span className="text-xs text-muted-foreground">Grátis</span>;
  }
  const formatted = `$${value.toFixed(value < 0.01 ? 4 : value < 1 ? 3 : 2)}`;
  return <span className="font-mono text-sm">{formatted}</span>;
}

type SortKey = 'label' | 'modelName' | 'inputCostPer1M' | 'outputCostPer1M' | 'active';
type SortDir = 'asc' | 'desc';

interface UnifiedModel {
  key: string;
  providerType: string;
  modelName: string;
  label: string;
  inputCostPer1M?: number;
  outputCostPer1M?: number;
  active: boolean;
  instances: GatewayModel[];
}

interface PriceEditState {
  unifiedKey: string;
  instanceIds: string[];
  input: string;
  output: string;
}

export function ModelsClient() {
  const { data: models, isLoading, mutate } = useModels();
  const { data: providers } = useProviders();
  const [syncing, setSyncing] = useState(false);
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [priceEdit, setPriceEdit] = useState<PriceEditState | null>(null);
  const [savingPrice, setSavingPrice] = useState(false);
  const [togglingAll, setTogglingAll] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('label');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    apiClient.models.sync()
      .then(() => mutate())
      .catch(() => { });
  }, []);

  const instanceTypeMap = new Map<string, string>(
    providers?.map((p) => [p.id, p.providerType]) ?? []
  );

  function getProviderType(modelValue: string): string {
    const instanceId = modelValue.split(':')[0];
    return instanceTypeMap.get(instanceId) ?? instanceId;
  }

  function getModelName(modelValue: string): string {
    const idx = modelValue.indexOf(':');
    return idx >= 0 ? modelValue.slice(idx + 1) : modelValue;
  }

  const activeProviderIds = providers
    ? new Set(providers.filter((p) => p.configured && p.enabled !== false).map((p) => p.id))
    : null;

  const filteredModels = (() => {
    if (!models?.length) return models;
    let result = models;
    if (activeProviderIds) {
      result = result.filter((m) => activeProviderIds.has(m.value.split(':')[0]));
    }
    if (filter.trim()) {
      try {
        const re = new RegExp(filter, 'i');
        result = result.filter((m) => re.test(m.label) || re.test(m.value));
      } catch { /* invalid regex — skip */ }
    }
    if (selectedProviders.size > 0) {
      result = result.filter((m) => selectedProviders.has(getProviderType(m.value)));
    }
    if (showFreeOnly) {
      result = result.filter((m) => m.value.toLowerCase().includes('free') || m.label.toLowerCase().includes('free') || m.label.toLowerCase().includes('(free)'));
    }
    return result;
  })();

  const unifiedModels: UnifiedModel[] = (() => {
    if (!filteredModels?.length) return [];
    const map = new Map<string, UnifiedModel>();
    for (const model of filteredModels) {
      const pt = getProviderType(model.value);
      const modelName = getModelName(model.value);
      const key = `${pt}::${modelName}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          providerType: pt,
          modelName,
          label: model.label,
          inputCostPer1M: model.inputCostPer1M,
          outputCostPer1M: model.outputCostPer1M,
          active: model.active,
          instances: [model],
        });
      } else {
        const u = map.get(key)!;
        u.instances.push(model);
        u.active = u.active && model.active;
      }
    }
    return [...map.values()];
  })();

  const isFilterInvalid = (() => {
    if (!filter.trim()) return false;
    try { new RegExp(filter); return false; } catch { return true; }
  })();

  const availableProviderTypes: string[] = unifiedModels.length
    ? [...new Set(unifiedModels.map((u) => u.providerType))].sort()
    : [];

  const providerColorsMap = Object.fromEntries(
    availableProviderTypes.map((pt, i) => [pt, getProviderColors(pt, i)])
  );

  const sortedUnified = (() => {
    if (!unifiedModels.length) return unifiedModels;
    return [...unifiedModels].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'label') return dir * a.label.localeCompare(b.label);
      if (sortKey === 'modelName') return dir * a.modelName.localeCompare(b.modelName);
      if (sortKey === 'active') return dir * (Number(a.active) - Number(b.active));
      const aVal = a[sortKey as 'inputCostPer1M' | 'outputCostPer1M'] ?? (sortDir === 'asc' ? Infinity : -Infinity);
      const bVal = b[sortKey as 'inputCostPer1M' | 'outputCostPer1M'] ?? (sortDir === 'asc' ? Infinity : -Infinity);
      return dir * (aVal - bVal);
    });
  })();

  function toggleProvider(p: string) {
    setSelectedProviders((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
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

  async function handleSyncPrices() {
    setSyncingPrices(true);
    try {
      const result = await apiClient.models.syncPrices();
      await mutate();
      toast.success(`${result.updated} de ${result.total} modelos atualizados`);
    } catch (err) {
      toast.error(`Não foi possível buscar preços: ${(err as Error).message}`);
    } finally {
      setSyncingPrices(false);
    }
  }

  async function handleToggleActive(instanceIds: string[], active: boolean) {
    try {
      await Promise.all(instanceIds.map((id) => apiClient.models.update(id, { active })));
      await mutate();
      toast.success(active ? 'Modelo ativado' : 'Modelo desativado');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleToggleAll(active: boolean) {
    if (!sortedUnified.length) return;
    setTogglingAll(true);
    try {
      const allIds = sortedUnified.flatMap((u) => u.instances.map((m) => m.id));
      await Promise.all(allIds.map((id) => apiClient.models.update(id, { active })));
      await mutate();
      toast.success(active ? 'Todos os modelos ativados' : 'Todos os modelos desativados');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setTogglingAll(false);
    }
  }

  function startPriceEdit(unified: UnifiedModel) {
    setPriceEdit({
      unifiedKey: unified.key,
      instanceIds: unified.instances.map((m) => m.id),
      input: unified.inputCostPer1M !== undefined ? String(unified.inputCostPer1M) : '',
      output: unified.outputCostPer1M !== undefined ? String(unified.outputCostPer1M) : '',
    });
  }

  async function savePriceEdit() {
    if (!priceEdit) return;
    const inputCostPer1M = priceEdit.input === '' ? undefined : parseFloat(priceEdit.input);
    const outputCostPer1M = priceEdit.output === '' ? undefined : parseFloat(priceEdit.output);
    if (
      (inputCostPer1M !== undefined && isNaN(inputCostPer1M)) ||
      (outputCostPer1M !== undefined && isNaN(outputCostPer1M))
    ) {
      toast.error('Valor de preço inválido');
      return;
    }
    setSavingPrice(true);
    try {
      await Promise.all(
        priceEdit.instanceIds.map((id) => apiClient.models.update(id, { inputCostPer1M, outputCostPer1M }))
      );
      await mutate();
      toast.success('Preço atualizado');
      setPriceEdit(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingPrice(false);
    }
  }

  const groupedByProvider = (() => {
    const map = new Map<string, UnifiedModel[]>();
    for (const u of sortedUnified) {
      if (!map.has(u.providerType)) map.set(u.providerType, []);
      map.get(u.providerType)!.push(u);
    }
    return map;
  })();
  const providerTypesSorted = [...groupedByProvider.keys()].sort();

  return (
    <TooltipProvider>
      <div>
        <PageHeader
          title="Modelos"
          description="Gerencie os modelos disponíveis"
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncPrices}
                disabled={syncingPrices}
              >
                <TrendingDown className={`mr-1.5 h-4 w-4${syncingPrices ? ' animate-pulse' : ''}`} />
                {syncingPrices ? 'Buscando preços...' : 'Atualizar preços'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`mr-1.5 h-4 w-4${syncing ? ' animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar'}
              </Button>
            </>
          }
        />

        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className={cn('pl-9 h-9', isFilterInvalid && 'border-destructive focus-visible:ring-destructive')}
              placeholder="Filtrar por regex — label ou model"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            {isFilterInvalid && (
              <p className="mt-1 text-xs text-destructive">Regex inválida</p>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setShowFreeOnly((v) => !v)}
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors cursor-pointer select-none',
                showFreeOnly
                  ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600'
                  : 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20'
              )}
            >
              Grátis
            </button>
            {availableProviderTypes.map((p) => {
              const active = selectedProviders.has(p);
              const colors = providerColorsMap[p];
              return (
                <button
                  key={p}
                  onClick={() => toggleProvider(p)}
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors cursor-pointer select-none',
                    active ? colors.chipActive : colors.chipInactive
                  )}
                >
                  {p}
                </button>
              );
            })}
            {(selectedProviders.size > 0 || showFreeOnly) && (
              <button
                onClick={() => { setSelectedProviders(new Set()); setShowFreeOnly(false); }}
                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors cursor-pointer select-none border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="mr-1 h-3 w-3" />
                Limpar
              </button>
            )}
          </div>
        </div>

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
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-9 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : !unifiedModels.length ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <Cpu className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium text-sm">
              {filter.trim() || selectedProviders.size > 0 || showFreeOnly
                ? 'Nenhum modelo corresponde ao filtro'
                : 'Nenhum modelo cadastrado'}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  {(
                    [
                      { key: 'label', label: 'Label', className: '' },
                      { key: 'modelName', label: 'Modelo', className: '' },
                      { key: 'inputCostPer1M', label: 'Input /1M', className: 'text-right' },
                      { key: 'outputCostPer1M', label: 'Output /1M', className: 'text-right' },
                    ] as { key: SortKey; label: string; className: string }[]
                  ).map(({ key, label: colLabel, className }) => {
                    const active = sortKey === key;
                    const Icon = active ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
                    return (
                      <TableHead
                        key={key}
                        className={cn('text-section-title h-10 cursor-pointer select-none', className)}
                        onClick={() => toggleSort(key)}
                      >
                        <span className={cn('inline-flex items-center gap-1', className === 'text-right' && 'flex-row-reverse w-full')}>
                          {colLabel}
                          <Icon className={cn('h-3.5 w-3.5', active ? 'text-foreground' : 'text-muted-foreground/50')} />
                        </span>
                      </TableHead>
                    );
                  })}
                  <TableHead className="text-section-title h-10 w-8" />
                  <TableHead className="text-section-title h-10">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1 cursor-pointer select-none"
                        onClick={() => toggleSort('active')}
                      >
                        Ativo
                        {sortKey === 'active'
                          ? (sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)
                          : <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />}
                      </span>
                      <Switch
                        checked={sortedUnified.length > 0 && sortedUnified.every((u) => u.active)}
                        onCheckedChange={handleToggleAll}
                        disabled={togglingAll || sortedUnified.length === 0}
                        className="scale-75 origin-left"
                        title={sortedUnified.every((u) => u.active) ? 'Desativar todos' : 'Ativar todos'}
                      />
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providerTypesSorted.flatMap((pt) => {
                  const ptModels = groupedByProvider.get(pt)!;
                  const ptColors = providerColorsMap[pt];
                  const instanceIds = [
                    ...new Set(
                      ptModels.flatMap((u) => u.instances.map((m) => m.value.split(':')[0]))
                    ),
                  ].sort();

                  return [
                    <TableRow key={`header-${pt}`} className="bg-muted/40 hover:bg-muted/40 border-t border-border/60">
                      <TableCell colSpan={6} className="py-1.5 px-4">
                        <span className={cn('text-xs font-semibold uppercase tracking-wide', ptColors?.providerText)}>
                          {pt}
                        </span>
                        {instanceIds.length > 1 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            · {instanceIds.join(', ')}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>,
                    ...ptModels.map((unified) => {
                      const isEditing = priceEdit?.unifiedKey === unified.key;
                      const colors = ptColors;
                      return (
                        <TableRow key={unified.key} className={cn('group hover:bg-muted/30 transition-colors duration-150', colors?.row)}>
                          <TableCell className="font-medium">{unified.label}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <code className="text-caption font-mono bg-muted px-1.5 py-0.5 rounded">
                                <span className="text-muted-foreground">{unified.modelName}</span>
                              </code>
                              {unified.instances.length > 1 && (
                                <span className={cn('text-xs font-semibold tabular-nums', colors?.providerText)}>
                                  ×{unified.instances.length}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          {isEditing ? (
                            <>
                              <TableCell className="text-right py-1.5">
                                <Input
                                  className="h-7 w-24 text-right font-mono text-xs ml-auto"
                                  value={priceEdit.input}
                                  onChange={(e) => setPriceEdit({ ...priceEdit, input: e.target.value })}
                                  placeholder="0.00"
                                  autoFocus
                                />
                              </TableCell>
                              <TableCell className="text-right py-1.5">
                                <Input
                                  className="h-7 w-24 text-right font-mono text-xs ml-auto"
                                  value={priceEdit.output}
                                  onChange={(e) => setPriceEdit({ ...priceEdit, output: e.target.value })}
                                  placeholder="0.00"
                                />
                              </TableCell>
                              <TableCell className="w-8 py-1.5">
                                <div className="flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-green-500 hover:text-green-400"
                                    onClick={savePriceEdit}
                                    disabled={savingPrice}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => setPriceEdit(null)}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-right">
                                <CostCell value={unified.inputCostPer1M} />
                              </TableCell>
                              <TableCell className="text-right">
                                <CostCell value={unified.outputCostPer1M} />
                              </TableCell>
                              <TableCell className="w-8">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => startPriceEdit(unified)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <Switch
                              checked={unified.active}
                              onCheckedChange={(checked) => handleToggleActive(unified.instances.map((m) => m.id), checked)}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    }),
                  ];
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
