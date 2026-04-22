'use client';

import { useAnalytics } from '@/hooks/useAnalytics';
import { GlobalModelsChart } from './GlobalModelsChart';
import { UserModelChart } from './UserModelChart';
import { Skeleton } from '@/components/ui/skeleton';

function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function AnalyticsClient() {
  const { data, isLoading, error } = useAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ChartSkeleton />
        <div className="grid gap-4 sm:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Erro ao carregar analytics: {(error as Error).message ?? 'Erro desconhecido'}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <GlobalModelsChart data={data?.byModel ?? []} />

      <div>
        <h2 className="mb-4 text-lg font-semibold">Por usuário</h2>
        {!data?.byUser.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.byUser.map((u) => (
              <UserModelChart key={u.user} user={u} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
