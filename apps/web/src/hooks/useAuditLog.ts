import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import type { AuditLogPage } from '@/types';

export function useAuditLog(page = 1, limit = 50, client?: string, level?: string) {
  const key = `/admin/audit-log?page=${page}&limit=${limit}` +
    (client ? `&client=${encodeURIComponent(client)}` : '') +
    (level ? `&level=${encodeURIComponent(level)}` : '');

  const { data, isLoading, error, mutate } = useSWR<AuditLogPage>(
    key,
    () => apiClient.auditLog.list(page, limit, client, level)
  );

  return { data, isLoading, error, mutate };
}
