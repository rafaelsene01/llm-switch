'use client';

import { useActivityDetail } from '@/hooks/useActivityDetail';
import { ActivityDetail } from '@/components/activity/ActivityDetail';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  id: number;
}

export function ActivityDetailClient({ id }: Props) {
  const { data, isLoading, error } = useActivityDetail(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Log não encontrado ou erro ao carregar.
      </div>
    );
  }

  return <ActivityDetail detail={data} />;
}
