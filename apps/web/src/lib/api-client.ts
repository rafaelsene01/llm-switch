import type {
  ActivityLogDetail,
  ActivityLogPage,
  AnalyticsData,
  AuditLogPage,
  BlocklistEntry,
  GatewayModel,
  GatewayProvider,
  ProviderModelInfo,
  TestResult,
  UserPublic,
  GatewayUser,
} from '@/types';

const ADMIN_KEY =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_ADMIN_KEY ?? ''
    : '';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_KEY}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function downloadExport(apiPath: string, filename: string): Promise<void> {
  const res = await fetch(apiPath, {
    headers: { Authorization: `Bearer ${ADMIN_KEY}` },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type ImportModule = 'blocklist' | 'users' | 'providers';

export interface ImportReport {
  added: Record<string, number>;
  skipped: Record<string, number>;
}

export interface ImportResult {
  success: boolean;
  mode: string;
  report: ImportReport;
}

export const apiClient = {
  blocklist: {
    list: () => apiFetch<BlocklistEntry[]>('/admin/blocklist'),
    add: (body: Partial<BlocklistEntry>) =>
      apiFetch<BlocklistEntry>('/admin/blocklist', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: string, patch: Partial<BlocklistEntry>) =>
      apiFetch<BlocklistEntry>(`/admin/blocklist/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    remove: (id: string) =>
      apiFetch<{ success: boolean }>(`/admin/blocklist/${id}`, { method: 'DELETE' }),
  },

  models: {
    list: () => apiFetch<GatewayModel[]>('/admin/models'),
    add: (body: { value: string; label?: string }) =>
      apiFetch<GatewayModel>('/admin/models', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, patch: { active?: boolean; inputCostPer1M?: number; outputCostPer1M?: number }) =>
      apiFetch<GatewayModel>(`/admin/models/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    remove: (id: string) =>
      apiFetch<{ success: boolean }>(`/admin/models/${id}`, { method: 'DELETE' }),
    sync: () =>
      apiFetch<{ synced: number; added: number; removed: number }>('/admin/models/sync', { method: 'POST' }),
    syncPrices: () =>
      apiFetch<{ updated: number; total: number; notFound: string[] }>('/admin/models/sync-prices', { method: 'POST' }),
  },

  users: {
    list: () => apiFetch<UserPublic[]>('/admin/users'),
    generateKey: () => apiFetch<{ key: string }>('/admin/users/generate-key'),
    add: (body: Omit<GatewayUser, 'id' | 'createdAt' | 'active'>) =>
      apiFetch<GatewayUser>('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, patch: Partial<GatewayUser>) =>
      apiFetch<GatewayUser>(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    remove: (id: string) =>
      apiFetch<{ success: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),
  },

  providers: {
    list: () => apiFetch<{ providers: GatewayProvider[] }>('/admin/providers').then((r) => r.providers),
    update: (id: string, body: { key?: string; url?: string; enabled?: boolean }) =>
      apiFetch<{ provider: GatewayProvider }>(`/admin/providers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r) => r.provider),
    removeKey: (id: string) =>
      fetch(`/admin/providers/${id}/key`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ADMIN_KEY}` },
      }).then((r) => { if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`); }),
    listModels: (id: string, params?: { key?: string; url?: string }) => {
      const qs = new URLSearchParams();
      if (params?.key) qs.set('key', params.key);
      if (params?.url) qs.set('url', params.url);
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return apiFetch<{ models: ProviderModelInfo[] }>(`/admin/providers/${id}/models${query}`).then((r) => r.models);
    },
    test: (id: string, body: { model: string; key?: string; url?: string }) =>
      apiFetch<TestResult>(`/admin/providers/${id}/test`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },

  activity: {
    list: (page = 1, limit = 50, user?: string) => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (user) qs.set('user', user);
      return apiFetch<ActivityLogPage>(`/admin/activity?${qs.toString()}`);
    },
    get: (id: number) =>
      apiFetch<ActivityLogDetail>(`/admin/activity/${id}`),
    remove: (id: number) =>
      apiFetch<{ success: boolean }>(`/admin/activity/${id}`, { method: 'DELETE' }),
    removeAll: () =>
      apiFetch<{ deleted: number }>('/admin/activity', { method: 'DELETE' }),
  },

  auditLog: {
    list: (page = 1, limit = 50, client?: string, level?: string) => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (client) qs.set('client', client);
      if (level) qs.set('level', level);
      return apiFetch<AuditLogPage>(`/admin/audit-log?${qs.toString()}`);
    },
  },

  analytics: {
    get: () => apiFetch<AnalyticsData>('/admin/analytics'),
  },

  config: {
    get: () => apiFetch<{ defaultProvider: string }>('/admin/config'),
  },

  export: {
    all: () => downloadExport('/admin/export', `gateway-config-${today()}.json`),
    module: (mod: ImportModule) =>
      downloadExport(`/admin/export/${mod}`, `gateway-${mod}-${today()}.json`),
  },

  import: {
    all: (payload: unknown, mode: 'merge' | 'replace' = 'merge') =>
      apiFetch<ImportResult>('/admin/import', {
        method: 'POST',
        body: JSON.stringify({ payload, mode }),
      }),
    module: (payload: unknown, mod: ImportModule, mode: 'merge' | 'replace' = 'merge') =>
      apiFetch<ImportResult>(`/admin/import/${mod}`, {
        method: 'POST',
        body: JSON.stringify({ payload, mode }),
      }),
  },
};
