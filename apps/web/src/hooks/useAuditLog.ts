import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import type { AuditLogPage } from '@/types';

export function useAuditLog(page = 1, limit = 50, client?: string, status?: string) {
  const key = `/admin/audit-log?page=${page}&limit=${limit}` +
    (client ? `&client=${encodeURIComponent(client)}` : '') +
    (status ? `&status=${encodeURIComponent(status)}` : '');

  const { data, isLoading, error, mutate } = useSWR<AuditLogPage>(
    key,
    () => apiClient.auditLog.list(page, limit, client, status)
  );

  return { data, isLoading, error, mutate };
}
