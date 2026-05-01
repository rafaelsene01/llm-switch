'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import type { GatewayProvider } from '@/types';
import { cn } from '@/lib/utils';

const PROVIDER_ICONS: Record<string, string> = {
  openrouter: 'OR',
  ollama: 'OLL',
  lmstudio: 'LMS',
};

const PROVIDER_COLORS: Record<string, string> = {
  openrouter: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  ollama: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
  lmstudio: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
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
      'group relative flex flex-col gap-0 shadow-card border-border/50 transition-all duration-200',
      isEnabled
        ? 'hover:border-primary/30 hover:shadow-md'
        : 'opacity-60 hover:opacity-75'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xs font-bold ${iconColor}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-none truncate">{provider.name}</p>
            <p className="mt-1 text-caption">
              {provider.type === 'cloud' ? 'Cloud API' : 'Local'}
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-2">
            {provider.configured ? (
              <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs px-2">
                Configurado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-xs px-2">
                Não configurado
              </Badge>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{isEnabled ? 'Ativo' : 'Inativo'}</span>
              <Switch
                checked={isEnabled}
                onCheckedChange={onToggleEnabled}
                disabled={!provider.configured}
                className="scale-75 origin-right"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        {provider.type === 'local' && provider.url && (
          <>
            <Separator className="opacity-50" />
            <p className="truncate rounded-md bg-muted px-2 py-1.5 text-xs font-mono text-muted-foreground">
              {provider.url}
            </p>
          </>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={provider.configured ? 'outline' : 'default'}
            onClick={onConfigure}
            className="flex-1"
          >
            {provider.configured ? 'Editar' : 'Configurar'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive px-2"
          >
            Remover
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
