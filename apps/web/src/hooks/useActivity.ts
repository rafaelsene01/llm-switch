import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import type { ActivityLogPage } from '@/types';

export function useActivity(page = 1, limit = 50) {
  const { data, isLoading, error, mutate } = useSWR<ActivityLogPage>(
    `/admin/activity?page=${page}&limit=${limit}`,
    () => apiClient.activity.list(page, limit)
  );

  return { data, isLoading, error, mutate };
}
