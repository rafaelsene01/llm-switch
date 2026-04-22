import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import type { ActivityLogPage } from '@/types';

export function useActivity(page = 1, limit = 50, user?: string) {
  const key = user
    ? `/admin/activity?page=${page}&limit=${limit}&user=${encodeURIComponent(user)}`
    : `/admin/activity?page=${page}&limit=${limit}`;

  const { data, isLoading, error, mutate } = useSWR<ActivityLogPage>(
    key,
    () => apiClient.activity.list(page, limit, user)
  );

  return { data, isLoading, error, mutate };
}
