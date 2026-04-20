import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import type { GatewayModel } from '@/types';

export function useModels() {
  const { data, isLoading, error, mutate } = useSWR<GatewayModel[]>(
    '/admin/models',
    () => apiClient.models.list()
  );

  return { data, isLoading, error, mutate };
}
