'use client';

import { useState } from 'react';
import { Plus, ServerOff } from 'lucide-react';
import { toast } from 'sonner';
import { mutate as globalMutate } from 'swr';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProviders } from '@/hooks/useProviders';
import { apiClient } from '@/lib/api-client';
import type { GatewayProvider } from '@/types';
import { ProviderCard } from './ProviderCard';
import { ProviderConfigDialog } from './ProviderConfigDialog';
import { AddProviderDialog } from './AddProviderDialog';
import { PageHeader } from '@/components/layout/PageHeader';

export function ProvidersClient() {
  const { data: providers, isLoading, error, mutate } = useProviders();
  const [selected, setSelected] = useState<GatewayProvider | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  async function handleToggleEnabled(provider: GatewayProvider, enabled: boolean) {
    try {
      await apiClient.providers.update(provider.id, { enabled });
      await mutate();
      await globalMutate('/admin/models');
      toast.success(enabled ? `${provider.name} ativado` : `${provider.name} desativado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar provider.');
    }
  }

  async function handleDelete(provider: GatewayProvider) {
    try {
      await apiClient.providers.remove(provider.id);
      await mutate();
      await globalMutate('/admin/models');
      toast.success(`${provider.name} removido.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover provider.');
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
        <p className="text-sm">Erro ao carregar providers.</p>
        <button
          className="text-sm underline underline-offset-2 hover:text-foreground transition-colors"
          onClick={() => mutate()}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Providers"
        description="Gerencie suas conexões de LLM."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar provider
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      ) : providers && providers.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onConfigure={() => setSelected(provider)}
              onToggleEnabled={(enabled) => handleToggleEnabled(provider, enabled)}
              onDelete={() => handleDelete(provider)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ServerOff className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Nenhum provider configurado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Adicione um provider para começar a usar o gateway.
            </p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar provider
          </Button>
        </div>
      )}

      <AddProviderDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={async () => { await mutate(); }}
      />

      {selected && (
        <ProviderConfigDialog
          provider={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          onSaved={async () => { await mutate(); await globalMutate('/admin/models'); }}
        />
      )}
    </div>
  );
}
