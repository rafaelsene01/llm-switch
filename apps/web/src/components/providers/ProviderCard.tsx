'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { GatewayProvider } from '@/types';

const PROVIDER_ICONS: Record<string, string> = {
  openai: 'OAI',
  anthropic: 'ANT',
  google: 'GGL',
  mistral: 'MST',
  openrouter: 'OR',
  ollama: 'OLL',
  lmstudio: 'LMS',
};

interface ProviderCardProps {
  provider: GatewayProvider;
  onConfigure: () => void;
}

export function ProviderCard({ provider, onConfigure }: ProviderCardProps) {
  const icon = PROVIDER_ICONS[provider.id] ?? provider.id.slice(0, 3).toUpperCase();

  return (
    <Card className="flex flex-col gap-0">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
              {icon}
            </div>
            <div>
              <p className="font-semibold leading-none">{provider.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {provider.type === 'cloud' ? 'Cloud API' : 'Local'}
              </p>
            </div>
          </div>
          {provider.configured ? (
            <Badge variant="default" className="shrink-0 bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">
              Configurado
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 text-muted-foreground">
              Não configurado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        {provider.type === 'local' && provider.url && (
          <p className="truncate rounded bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">
            {provider.url}
          </p>
        )}
        <Button size="sm" variant="outline" onClick={onConfigure} className="w-full">
          {provider.configured ? 'Editar configuração' : 'Configurar'}
        </Button>
      </CardContent>
    </Card>
  );
}
