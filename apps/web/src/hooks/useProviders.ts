import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import type { GatewayProvider } from '@/types';

export function useProviders() {
  const { data, isLoading, error, mutate } = useSWR<GatewayProvider[]>(
    '/admin/providers',
    () => apiClient.providers.list()
  );

  return { data, isLoading, error, mutate };
}
