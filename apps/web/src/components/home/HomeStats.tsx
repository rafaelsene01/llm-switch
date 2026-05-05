'use client';

import { Cpu, Users, Plug } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUsers } from '@/hooks/useUsers';
import { useModels } from '@/hooks/useModels';
import { useProviders } from '@/hooks/useProviders';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

function StatCard({ icon: Icon, label, value, sub, accent = 'text-primary' }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border/50 bg-card px-5 py-4 shadow-card">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/8">
        <Icon className={`h-[18px] w-[18px] ${accent}`} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums leading-none tracking-tight">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border/50 bg-card px-5 py-4">
      <Skeleton className="h-10 w-10 rounded-md shrink-0" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-7 w-14" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  );
}

export function HomeStats() {
  const { data: users, isLoading: loadingUsers } = useUsers();
  const { data: models, isLoading: loadingModels } = useModels();
  const { data: providers, isLoading: loadingProviders } = useProviders();

  const isLoading = loadingUsers || loadingModels || loadingProviders;

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  const activeUsers = users?.filter((u) => u.active).length ?? 0;
  const totalUsers = users?.length ?? 0;
  const activeModels = models?.filter((m) => m.active).length ?? 0;
  const totalModels = models?.length ?? 0;
  const configuredProviders = providers?.filter((p) => p.configured).length ?? 0;
  const totalProviders = providers?.length ?? 0;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard
        icon={Users}
        label="Usuários ativos"
        value={activeUsers}
        sub={`${totalUsers} cadastrados`}
      />
      <StatCard
        icon={Cpu}
        label="Modelos ativos"
        value={activeModels}
        sub={`${totalModels} configurados`}
      />
      <StatCard
        icon={Plug}
        label="Providers"
        value={configuredProviders}
        sub={`${totalProviders} disponíveis`}
      />
    </div>
  );
}
