import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import type { BlocklistEntry } from '@/types';

export function useRules() {
  const { data, isLoading, error, mutate } = useSWR<BlocklistEntry[]>(
    '/admin/blocklist',
    () => apiClient.blocklist.list()
  );

  return { data, isLoading, error, mutate };
}
