'use client';

import { Activity, BarChart2, Cpu, DollarSign, Users } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { GlobalModelsChart } from './GlobalModelsChart';
import { UserModelChart } from './UserModelChart';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCost } from '@/lib/utils';

function fmt(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-card px-5 py-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 truncate">{label}</p>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/8">
          <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight">{value}</p>
        {sub && <p className="mt-1.5 text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-card px-5 py-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
      <Skeleton className="h-7 w-20" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-5 shadow-card space-y-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-[200px] w-full" />
    </div>
  );
}

export function AnalyticsClient() {
  const { data, isLoading, error } = useAnalytics();

  const totalTokens = data?.byModel.reduce((s, m) => s + m.totalTokens, 0) ?? 0;
  const totalRequests = data?.byModel.reduce((s, m) => s + m.requestCount, 0) ?? 0;
  const totalCostUsd = data?.byModel.reduce((s, m) => s + m.totalCostUsd, 0) ?? 0;
  const activeUsers = data?.byUser.length ?? 0;
  const topModel = data?.byModel[0]?.model ?? '—';

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Uso de modelos e tokens por usuário"
      />

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)}
          </div>
          <ChartSkeleton />
          <div className="grid gap-4 sm:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Erro ao carregar analytics: {(error as Error).message ?? 'Erro desconhecido'}
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              icon={Activity}
              label="Requisições"
              value={totalRequests.toLocaleString('pt-BR')}
            />
            <KpiCard
              icon={BarChart2}
              label="Tokens"
              value={fmt(totalTokens)}
            />
            <KpiCard
              icon={DollarSign}
              label="Custo total"
              value={formatCost(totalCostUsd)}
            />
            <KpiCard
              icon={Users}
              label="Usuários ativos"
              value={String(activeUsers)}
            />
            <KpiCard
              icon={Cpu}
              label="Modelo principal"
              value={topModel}
              sub={data?.byModel[0] ? `${data.byModel[0].requestCount.toLocaleString()} req` : undefined}
            />
          </div>

          {/* Global models chart */}
          <GlobalModelsChart data={data?.byModel ?? []} />

          {/* Per-user charts */}
          {!!data?.byUser.length && (
            <div>
              <p className="mb-4 text-section-title">Por usuário</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.byUser.map((u) => (
                  <UserModelChart key={u.user} user={u} />
                ))}
              </div>
            </div>
          )}

          {!data?.byUser.length && !data?.byModel.length && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-20 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <BarChart2 className="h-5 w-5 text-muted-foreground/40" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium">Nenhuma atividade registrada</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-[280px]">
                Os dados aparecem conforme o gateway recebe requisições
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
