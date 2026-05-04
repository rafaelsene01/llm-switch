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
import { Label } from '@/components/ui/label';
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
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import type { GatewayModel, ModelRateLimit } from '@/types';


interface ProviderColors {
  chipActive: string;
  chipInactive: string;
  providerText: string;
  row: string;
}

const PROVIDER_COLOR_MAP: Record<string, ProviderColors> = {
  openai:    { chipActive: 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600',    chipInactive: 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20',    providerText: 'text-emerald-500',  row: 'bg-emerald-500/[0.04]' },
  anthropic: { chipActive: 'bg-orange-500 border-orange-500 text-white hover:bg-orange-600',       chipInactive: 'border-orange-500/40 text-orange-500 bg-orange-500/10 hover:bg-orange-500/20',       providerText: 'text-orange-500',   row: 'bg-orange-500/[0.04]' },
  google:    { chipActive: 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600',             chipInactive: 'border-blue-500/40 text-blue-500 bg-blue-500/10 hover:bg-blue-500/20',             providerText: 'text-blue-500',     row: 'bg-blue-500/[0.04]' },
  mistral:   { chipActive: 'bg-violet-500 border-violet-500 text-white hover:bg-violet-600',       chipInactive: 'border-violet-500/40 text-violet-500 bg-violet-500/10 hover:bg-violet-500/20',       providerText: 'text-violet-500',   row: 'bg-violet-500/[0.04]' },
  cohere:    { chipActive: 'bg-teal-500 border-teal-500 text-white hover:bg-teal-600',             chipInactive: 'border-teal-500/40 text-teal-500 bg-teal-500/10 hover:bg-teal-500/20',             providerText: 'text-teal-500',     row: 'bg-teal-500/[0.04]' },
  meta:      { chipActive: 'bg-indigo-500 border-indigo-500 text-white hover:bg-indigo-600',       chipInactive: 'border-indigo-500/40 text-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20',       providerText: 'text-indigo-500',   row: 'bg-indigo-500/[0.04]' },
  groq:      { chipActive: 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600',          chipInactive: 'border-amber-500/40 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20',          providerText: 'text-amber-500',    row: 'bg-amber-500/[0.04]' },
  bedrock:   { chipActive: 'bg-rose-500 border-rose-500 text-white hover:bg-rose-600',             chipInactive: 'border-rose-500/40 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20',             providerText: 'text-rose-500',     row: 'bg-rose-500/[0.04]' },
  azure:     { chipActive: 'bg-sky-500 border-sky-500 text-white hover:bg-sky-600',                chipInactive: 'border-sky-500/40 text-sky-500 bg-sky-500/10 hover:bg-sky-500/20',                providerText: 'text-sky-500',      row: 'bg-sky-500/[0.04]' },
  ollama:    { chipActive: 'bg-slate-500 border-slate-500 text-white hover:bg-slate-600',          chipInactive: 'border-slate-400/40 text-slate-400 bg-slate-500/10 hover:bg-slate-500/20',          providerText: 'text-slate-400',    row: 'bg-slate-500/[0.04]' },
};

const FALLBACK_PALETTE: ProviderColors[] = [
  { chipActive: 'bg-pink-500 border-pink-500 text-white hover:bg-pink-600',     chipInactive: 'border-pink-500/40 text-pink-500 bg-pink-500/10 hover:bg-pink-500/20',     providerText: 'text-pink-500',    row: 'bg-pink-500/[0.04]' },
  { chipActive: 'bg-cyan-500 border-cyan-500 text-white hover:bg-cyan-600',     chipInactive: 'border-cyan-500/40 text-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20',     providerText: 'text-cyan-500',    row: 'bg-cyan-500/[0.04]' },
  { chipActive: 'bg-lime-500 border-lime-500 text-white hover:bg-lime-600',     chipInactive: 'border-lime-500/40 text-lime-500 bg-lime-500/10 hover:bg-lime-500/20',     providerText: 'text-lime-500',    row: 'bg-lime-500/[0.04]' },
  { chipActive: 'bg-fuchsia-500 border-fuchsia-500 text-white hover:bg-fuchsia-600', chipInactive: 'border-fuchsia-500/40 text-fuchsia-500 bg-fuchsia-500/10 hover:bg-fuchsia-500/20', providerText: 'text-fuchsia-500', row: 'bg-fuchsia-500/[0.04]' },
  { chipActive: 'bg-red-500 border-red-500 text-white hover:bg-red-600',        chipInactive: 'border-red-500/40 text-red-500 bg-red-500/10 hover:bg-red-500/20',        providerText: 'text-red-500',     row: 'bg-red-500/[0.04]' },
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

type SortKey = 'label' | 'value' | 'inputCostPer1M' | 'outputCostPer1M' | 'active';
type SortDir = 'asc' | 'desc';

interface PriceEditState {
  modelId: string;
  input: string;
  output: string;
}

type AmountSuffix = 'raw' | 'K' | 'M' | 'B' | 'T';

const SUFFIX_MULTIPLIER: Record<AmountSuffix, number> = {
  raw: 1,
  K: 1_000,
  M: 1_000_000,
  B: 1_000_000_000,
  T: 1_000_000_000_000,
};

function detectSuffix(amount: number): { base: string; suffix: AmountSuffix } {
  if (amount >= 1_000_000_000_000 && amount % 1_000_000_000_000 === 0)
    return { base: String(amount / 1_000_000_000_000), suffix: 'T' };
  if (amount >= 1_000_000_000 && amount % 1_000_000_000 === 0)
    return { base: String(amount / 1_000_000_000), suffix: 'B' };
  if (amount >= 1_000_000 && amount % 1_000_000 === 0)
    return { base: String(amount / 1_000_000), suffix: 'M' };
  if (amount >= 1_000 && amount % 1_000 === 0)
    return { base: String(amount / 1_000), suffix: 'K' };
  return { base: String(amount), suffix: 'raw' };
}

interface LimitEditState {
  modelId: string;
  amountBase: string;
  amountSuffix: AmountSuffix;
  unit: ModelRateLimit['unit'];
  interval: ModelRateLimit['interval'];
  intervalHours: string;
}

function formatRateLimit(rl: ModelRateLimit): string {
  const amt = rl.amount >= 1_000_000
    ? `${(rl.amount / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
    : rl.amount >= 1_000
    ? `${(rl.amount / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
    : String(rl.amount);
  const unit = rl.unit === 'tokens' ? 'tokens' : 'req';
  const interval =
    rl.interval === 'weekly' ? 'sem' :
    rl.interval === 'daily' ? 'dia' :
    `${rl.intervalHours ?? 1}h`;
  return `${amt} ${unit}/${interval}`;
}

export function ModelsClient() {
  const { data: models, isLoading, mutate } = useModels();
  const { data: providers } = useProviders();
  const [syncing, setSyncing] = useState(false);
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [priceEdit, setPriceEdit] = useState<PriceEditState | null>(null);
  const [savingPrice, setSavingPrice] = useState(false);
  const [limitEdit, setLimitEdit] = useState<LimitEditState | null>(null);
  const [savingLimit, setSavingLimit] = useState(false);
  const [togglingAll, setTogglingAll] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('label');

  useEffect(() => {
    apiClient.models.sync()
      .then(() => mutate())
      .catch(() => {});
  }, []);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const availableProviders: string[] = models?.length
    ? [...new Set(models.map((m) => m.value.split(':')[0]).filter(Boolean))].sort()
    : [];

  const providerColorsMap = Object.fromEntries(
    availableProviders.map((p, i) => [p, getProviderColors(p, i)])
  );

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
      result = result.filter((m) => selectedProviders.has(m.value.split(':')[0]));
    }
    return result;
  })();

  const isFilterInvalid = (() => {
    if (!filter.trim()) return false;
    try { new RegExp(filter); return false; } catch { return true; }
  })();

  const sortedModels = (() => {
    if (!filteredModels?.length) return filteredModels;
    return [...filteredModels].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'label') return dir * a.label.localeCompare(b.label);
      if (sortKey === 'value') return dir * a.value.localeCompare(b.value);
      if (sortKey === 'active') return dir * (Number(a.active) - Number(b.active));
      // numeric columns — undefined/null sorts last regardless of direction
      const aVal = a[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity);
      const bVal = b[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity);
      return dir * (aVal - bVal);
    });
  })();

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


  async function handleToggleActive(id: string, active: boolean) {
    try {
      await apiClient.models.update(id, { active });
      await mutate();
      toast.success(active ? 'Modelo ativado' : 'Modelo desativado');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleToggleAll(active: boolean) {
    if (!sortedModels?.length) return;
    setTogglingAll(true);
    try {
      await Promise.all(sortedModels.map((m) => apiClient.models.update(m.id, { active })));
      await mutate();
      toast.success(active ? 'Todos os modelos ativados' : 'Todos os modelos desativados');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setTogglingAll(false);
    }
  }

  function startPriceEdit(model: GatewayModel) {
    setPriceEdit({
      modelId: model.id,
      input: model.inputCostPer1M !== undefined ? String(model.inputCostPer1M) : '',
      output: model.outputCostPer1M !== undefined ? String(model.outputCostPer1M) : '',
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
      await apiClient.models.update(priceEdit.modelId, { inputCostPer1M, outputCostPer1M });
      await mutate();
      toast.success('Preço atualizado');
      setPriceEdit(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingPrice(false);
    }
  }

  function startLimitEdit(model: GatewayModel) {
    const { base, suffix } = model.rateLimit
      ? detectSuffix(model.rateLimit.amount)
      : { base: '', suffix: 'M' as AmountSuffix };
    setLimitEdit({
      modelId: model.id,
      amountBase: base,
      amountSuffix: suffix,
      unit: model.rateLimit?.unit ?? 'tokens',
      interval: model.rateLimit?.interval ?? 'weekly',
      intervalHours: model.rateLimit?.intervalHours ? String(model.rateLimit.intervalHours) : '1',
    });
  }

  async function saveLimitEdit() {
    if (!limitEdit) return;
    const base = parseFloat(limitEdit.amountBase);
    if (!limitEdit.amountBase || isNaN(base) || base <= 0) {
      toast.error('Quantidade inválida');
      return;
    }
    const amount = Math.round(base * SUFFIX_MULTIPLIER[limitEdit.amountSuffix]);
    const intervalHours = limitEdit.interval === 'hourly' ? parseInt(limitEdit.intervalHours, 10) : undefined;
    if (limitEdit.interval === 'hourly' && (!intervalHours || isNaN(intervalHours) || intervalHours <= 0)) {
      toast.error('Intervalo de horas inválido');
      return;
    }
    const rateLimit: ModelRateLimit = {
      amount,
      unit: limitEdit.unit,
      interval: limitEdit.interval,
      ...(intervalHours ? { intervalHours } : {}),
    };
    setSavingLimit(true);
    try {
      await apiClient.models.update(limitEdit.modelId, { rateLimit });
      await mutate();
      toast.success('Limite salvo');
      setLimitEdit(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingLimit(false);
    }
  }

  async function clearLimit(id: string) {
    try {
      await apiClient.models.update(id, { rateLimit: null });
      await mutate();
      toast.success('Limite removido');
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
              placeholder="Filtrar por regex — label ou provider:model"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            {isFilterInvalid && (
              <p className="mt-1 text-xs text-destructive">Regex inválida</p>
            )}
          </div>

          {availableProviders.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {availableProviders.map((p) => {
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
              {selectedProviders.size > 0 && (
                <button
                  onClick={() => setSelectedProviders(new Set())}
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors cursor-pointer select-none border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="mr-1 h-3 w-3" />
                  Limpar
                </button>
              )}
            </div>
          )}
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
        ) : !filteredModels?.length ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <Cpu className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium text-sm">
              {filter.trim() || selectedProviders.size > 0
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
                      { key: 'value', label: 'Provider:Model', className: '' },
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
                  <TableHead className="text-section-title h-10">Limite</TableHead>
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
                        checked={!!sortedModels?.length && sortedModels.every((m) => m.active)}
                        onCheckedChange={handleToggleAll}
                        disabled={togglingAll || !sortedModels?.length}
                        className="scale-75 origin-left"
                        title={sortedModels?.every((m) => m.active) ? 'Desativar todos' : 'Ativar todos'}
                      />
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedModels!.map((model) => {
                  const isEditing = priceEdit?.modelId === model.id;
                  const [providerPart, ...modelParts] = model.value.split(':');
                  const modelPart = modelParts.join(':');
                  const colors = providerColorsMap[providerPart];
                  return (
                    <TableRow key={model.id} className={cn('group hover:bg-muted/30 transition-colors duration-150', colors?.row)}>
                      <TableCell className="font-medium">{model.label}</TableCell>
                      <TableCell>
                        <code className="text-caption font-mono bg-muted px-1.5 py-0.5 rounded">
                          <span className={colors?.providerText}>{providerPart}</span>
                          {modelPart && <span className="text-muted-foreground">:{modelPart}</span>}
                        </code>
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
                            <CostCell value={model.inputCostPer1M} />
                          </TableCell>
                          <TableCell className="text-right">
                            <CostCell value={model.outputCostPer1M} />
                          </TableCell>
                          <TableCell className="w-8">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => startPriceEdit(model)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        {model.rateLimit ? (
                          <span className="font-mono text-xs tabular-nums">
                            {formatRateLimit(model.rateLimit)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50 italic">não definido</span>
                        )}
                      </TableCell>
                      <TableCell className="w-8">
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => startLimitEdit(model)}
                            title="Editar limite"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {model.rateLimit && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => clearLimit(model.id)}
                              title="Remover limite"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={model.active}
                          onCheckedChange={(checked) => handleToggleActive(model.id, checked)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={!!limitEdit} onOpenChange={(o) => !o && setLimitEdit(null)}>
          <DialogContent>
            <DialogHeader className="border-b border-border pb-4 mb-2">
              <DialogTitle className="text-base font-semibold">Editar Limite de Uso</DialogTitle>
            </DialogHeader>
            {limitEdit && (
              <div className="space-y-4">
                <div>
                  <Label className="text-field-label">Quantidade</Label>
                  <div className="mt-1.5 flex gap-2">
                    <Input
                      className="font-mono"
                      placeholder="ex: 500"
                      value={limitEdit.amountBase}
                      onChange={(e) => setLimitEdit({ ...limitEdit, amountBase: e.target.value })}
                      autoFocus
                    />
                    <Select
                      value={limitEdit.amountSuffix}
                      onValueChange={(v) => setLimitEdit({ ...limitEdit, amountSuffix: v as AmountSuffix })}
                    >
                      <SelectTrigger className="w-28 font-mono [&>span]:flex-1 [&>span]:text-left">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="raw">Unidade</SelectItem>
                        <SelectItem value="K">K (mil)</SelectItem>
                        <SelectItem value="M">M (milhão)</SelectItem>
                        <SelectItem value="B">B (bilhão)</SelectItem>
                        <SelectItem value="T">T (trilhão)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {limitEdit.amountBase && !isNaN(parseFloat(limitEdit.amountBase)) && (
                    <p className="mt-1 text-xs text-muted-foreground font-mono">
                      = {(parseFloat(limitEdit.amountBase) * SUFFIX_MULTIPLIER[limitEdit.amountSuffix]).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-field-label">Unidade</Label>
                  <Select
                    value={limitEdit.unit}
                    onValueChange={(v) => setLimitEdit({ ...limitEdit, unit: v as ModelRateLimit['unit'] })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tokens">Tokens</SelectItem>
                      <SelectItem value="requests">Requisições</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-field-label">Intervalo</Label>
                  <Select
                    value={limitEdit.interval}
                    onValueChange={(v) => setLimitEdit({ ...limitEdit, interval: v as ModelRateLimit['interval'] })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Por hora</SelectItem>
                      <SelectItem value="daily">Por dia</SelectItem>
                      <SelectItem value="weekly">Por semana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {limitEdit.interval === 'hourly' && (
                  <div>
                    <Label className="text-field-label">A cada quantas horas</Label>
                    <Input
                      className="mt-1.5 font-mono"
                      placeholder="ex: 1"
                      value={limitEdit.intervalHours}
                      onChange={(e) => setLimitEdit({ ...limitEdit, intervalHours: e.target.value })}
                    />
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="border-t border-border pt-4 mt-2">
              <Button variant="outline" onClick={() => setLimitEdit(null)}>Cancelar</Button>
              <Button onClick={saveLimitEdit} disabled={savingLimit}>
                {savingLimit ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
}
