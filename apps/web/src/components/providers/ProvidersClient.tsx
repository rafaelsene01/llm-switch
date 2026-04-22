'use client';

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useProviders } from '@/hooks/useProviders';
import type { GatewayProvider } from '@/types';
import { ProviderCard } from './ProviderCard';
import { ProviderConfigDialog } from './ProviderConfigDialog';
import { ImportExportActions } from '@/components/shared/ImportExportActions';
import { PageHeader } from '@/components/layout/PageHeader';

export function ProvidersClient() {
  const { data: providers, isLoading, error, mutate } = useProviders();
  const [selected, setSelected] = useState<GatewayProvider | null>(null);

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
        description="Gerencie as chaves de API e conexões dos providers de LLM."
        actions={<ImportExportActions module="providers" onImportSuccess={mutate} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-lg" />
            ))
          : providers?.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onConfigure={() => setSelected(provider)}
              />
            ))}
      </div>

      {selected && (
        <ProviderConfigDialog
          provider={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          onSaved={() => mutate()}
        />
      )}
    </div>
  );
}
