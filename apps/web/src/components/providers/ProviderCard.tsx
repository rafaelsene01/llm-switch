'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { GatewayProvider } from '@/types';
import { cn } from '@/lib/utils';

const PROVIDER_ICONS: Record<string, string> = {
  openrouter: 'OR',
  ollama: 'OLL',
  lmstudio: 'LMS',
};

const PROVIDER_COLORS: Record<string, string> = {
  openrouter: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  ollama: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  lmstudio: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
};

interface ProviderCardProps {
  provider: GatewayProvider;
  onConfigure: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onDelete: () => void;
}

export function ProviderCard({ provider, onConfigure, onToggleEnabled, onDelete }: ProviderCardProps) {
  const pType = provider.providerType;
  const icon = PROVIDER_ICONS[pType] ?? pType.slice(0, 3).toUpperCase();
  const iconColor = PROVIDER_COLORS[pType] ?? 'bg-muted text-muted-foreground';
  const isEnabled = provider.enabled !== false;

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Remover "${provider.name}"? Os modelos associados também serão removidos.`)) return;
    onDelete();
  }

  return (
    <Card className={cn(
      'group relative flex flex-col shadow-card transition-all duration-200',
      isEnabled
        ? 'border-border/50 hover:border-primary/25 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
        : 'border-border/30 opacity-55 hover:opacity-70'
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xs font-bold tracking-tight', iconColor)}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-none truncate">{provider.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {provider.type === 'cloud' ? 'Cloud API' : 'Local'}
            </p>
          </div>
          <div className="shrink-0">
            {provider.configured ? (
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                Configurado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Não configurado
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pt-0">
        {provider.type === 'local' && provider.url && (
          <p className="truncate rounded-md bg-muted/60 px-2.5 py-1.5 text-xs font-mono text-muted-foreground border border-border/40">
            {provider.url}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('h-1.5 w-1.5 rounded-full', isEnabled ? 'bg-emerald-500' : 'bg-zinc-400')} />
            <span className="text-xs text-muted-foreground">{isEnabled ? 'Ativo' : 'Inativo'}</span>
            <Switch
              checked={isEnabled}
              onCheckedChange={onToggleEnabled}
              disabled={!provider.configured}
              className="scale-[0.8] origin-left"
            />
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={provider.configured ? 'outline' : 'default'}
              onClick={onConfigure}
              className="h-7 px-3 text-xs"
            >
              {provider.configured ? 'Editar' : 'Configurar'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              className="h-7 px-2 text-xs text-destructive/70 hover:bg-destructive/8 hover:text-destructive"
            >
              Remover
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
