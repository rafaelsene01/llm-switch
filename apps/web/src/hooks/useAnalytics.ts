import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import type { AnalyticsData } from '@/types';

export function useAnalytics() {
  const { data, isLoading, error, mutate } = useSWR<AnalyticsData>(
    '/admin/analytics',
    () => apiClient.analytics.get()
  );

  return { data, isLoading, error, mutate };
}
