import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import type { UserPublic } from '@/types';

export function useUsers() {
  const { data, isLoading, error, mutate } = useSWR<UserPublic[]>(
    '/admin/users',
    () => apiClient.users.list()
  );

  return { data, isLoading, error, mutate };
}
