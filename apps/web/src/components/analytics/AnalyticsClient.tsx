'use client';

import { Activity, BarChart2, Cpu, DollarSign, Users } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { GlobalModelsChart } from './GlobalModelsChart';
import { UserModelChart } from './UserModelChart';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
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
    <Card className="shadow-card border-border/50">
      <CardContent className="flex items-start gap-3 pt-4 pb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-caption truncate">{label}</p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums leading-none">{value}</p>
          {sub && <p className="mt-1 text-caption truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="pt-5 space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-[200px] w-full" />
      </CardContent>
    </Card>
  );
}

export function AnalyticsClient() {
  const { data, isLoading, error } = useAnalytics();

  const totalTokens = data?.byModel.reduce((s, m) => s + m.totalTokens, 0) ?? 0;
  const totalRequests = data?.byModel.reduce((s, m) => s + m.requestCount, 0) ?? 0;
  const totalCostUsd = data?.byModel.reduce((s, m) => s + m.totalCostUsd, 0) ?? 0;
  const activeUsers = data?.byUser.length ?? 0;
  const topModel = data?.byModel[0]?.model
    ? data.byModel[0].model.includes(':')
      ? data.byModel[0].model.split(':').slice(1).join(':')
      : data.byModel[0].model
    : '—';

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Uso de modelos e tokens por usuário"
      />

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="shadow-card border-border/50">
                <CardContent className="flex items-start gap-3 pt-4 pb-4">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <ChartSkeleton />
          <div className="grid gap-4 sm:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Erro ao carregar analytics: {(error as Error).message ?? 'Erro desconhecido'}
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              icon={Activity}
              label="Total de requisições"
              value={totalRequests.toLocaleString('pt-BR')}
            />
            <KpiCard
              icon={BarChart2}
              label="Total de tokens"
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
              label="Modelo mais usado"
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
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <BarChart2 className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="font-medium text-sm">Nenhuma atividade registrada</p>
              <p className="mt-1 text-caption">Os dados aparecerão conforme o gateway recebe requisições</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
