import type {
  BlocklistEntry,
  GatewayModel,
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
    remove: (id: string) =>
      apiFetch<{ success: boolean }>(`/admin/models/${id}`, { method: 'DELETE' }),
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

  config: {
    get: () => apiFetch<{ defaultProvider: string }>('/admin/config'),
  },

  export: {
    all: () => apiFetch<unknown>('/admin/export'),
  },

  import: {
    all: (payload: unknown, mode: 'merge' | 'replace' = 'merge') =>
      apiFetch<unknown>('/admin/import', {
        method: 'POST',
        body: JSON.stringify({ payload, mode }),
      }),
  },
};
