import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import type { ActivityLogDetail } from '@/types';

export function useActivityDetail(id: number) {
  const { data, isLoading, error } = useSWR<ActivityLogDetail>(
    `/admin/activity/${id}`,
    () => apiClient.activity.get(id)
  );

  return { data, isLoading, error };
}
