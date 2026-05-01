'use client';

import { Cpu, Users, Plug } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUsers } from '@/hooks/useUsers';
import { useModels } from '@/hooks/useModels';
import { useProviders } from '@/hooks/useProviders';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}

function StatCard({ icon: Icon, label, value, sub }: StatCardProps) {
  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="flex items-center gap-3 pt-4 pb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-caption">{label}</p>
          <p className="text-xl font-semibold tabular-nums leading-snug">{value}</p>
          {sub && <p className="text-caption">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="flex items-center gap-3 pt-4 pb-4">
        <Skeleton className="h-9 w-9 rounded-md shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-10" />
        </div>
      </CardContent>
    </Card>
  );
}

export function HomeStats() {
  const { data: users, isLoading: loadingUsers } = useUsers();
  const { data: models, isLoading: loadingModels } = useModels();
  const { data: providers, isLoading: loadingProviders } = useProviders();

  const isLoading = loadingUsers || loadingModels || loadingProviders;

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
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
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        icon={Users}
        label="Usuários"
        value={activeUsers}
        sub={`${totalUsers} total`}
      />
      <StatCard
        icon={Cpu}
        label="Modelos ativos"
        value={activeModels}
        sub={`${totalModels} total`}
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
