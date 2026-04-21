'use client';

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useProviders } from '@/hooks/useProviders';
import type { GatewayProvider } from '@/types';
import { ProviderCard } from './ProviderCard';
import { ProviderConfigDialog } from './ProviderConfigDialog';

export function ProvidersClient() {
  const { data: providers, isLoading, error, mutate } = useProviders();
  const [selected, setSelected] = useState<GatewayProvider | null>(null);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
        <p>Erro ao carregar providers.</p>
        <button
          className="text-sm underline underline-offset-2"
          onClick={() => mutate()}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Providers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie as chaves de API e conexões dos providers de LLM.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 7 }).map((_, i) => (
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
