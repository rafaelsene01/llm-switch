'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { apiClient } from '@/lib/api-client';
import type { GatewayProvider } from '@/types';
import { CloudProviderForm } from './CloudProviderForm';
import { LocalProviderForm } from './LocalProviderForm';
import { ProviderTestPanel } from './ProviderTestPanel';

// Providers that support dynamic model listing — key validated via listModels API call
const DYNAMIC_PROVIDERS = new Set(['openrouter', 'ollama', 'lmstudio']);

interface ProviderConfigDialogProps {
  provider: GatewayProvider;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type SaveStage = 'idle' | 'validating' | 'saving';

export function ProviderConfigDialog({ provider, open, onClose, onSaved }: ProviderConfigDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [url, setUrl] = useState(provider.url ?? '');
  // Unconfigured providers will auto-enable on first configure; configured ones respect stored state
  const [enabled, setEnabled] = useState(provider.configured ? provider.enabled : true);
  const [keyError, setKeyError] = useState('');
  const [urlError, setUrlError] = useState('');
  const [saveStage, setSaveStage] = useState<SaveStage>('idle');
  const [removing, setRemoving] = useState(false);

  const isSaving = saveStage !== 'idle';

  function validateForm(): boolean {
    let ok = true;
    if (provider.type === 'cloud' && !apiKey.trim()) {
      setKeyError('API key obrigatória.');
      ok = false;
    } else {
      setKeyError('');
    }
    if (provider.type === 'local' && !url.trim()) {
      setUrlError('URL obrigatória.');
      ok = false;
    } else {
      setUrlError('');
    }
    return ok;
  }

  async function validateCredentials(): Promise<boolean> {
    const candidateKey = apiKey.trim() || undefined;
    const candidateUrl = provider.type === 'local'
      ? url.trim().replace(/\/$/, '') || undefined
      : undefined;

    try {
      if (DYNAMIC_PROVIDERS.has(provider.providerType)) {
        await apiClient.providers.listModels(provider.id, { key: candidateKey, url: candidateUrl });
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível validar a chave.';
      if (provider.type === 'cloud') setKeyError(msg);
      else setUrlError(msg);
      return false;
    }
  }

  async function handleSave() {
    if (!validateForm()) return;

    const hasNewKey = Boolean(apiKey.trim());
    const hasUrlChange = provider.type === 'local' &&
      url.trim().replace(/\/$/, '') !== (provider.url ?? '').replace(/\/$/, '');

    if (hasNewKey || hasUrlChange) {
      setSaveStage('validating');
      const valid = await validateCredentials();
      if (!valid) {
        setSaveStage('idle');
        return;
      }
    }

    setSaveStage('saving');
    try {
      const body: { key?: string; url?: string; enabled?: boolean } = { enabled };
      if (apiKey.trim()) body.key = apiKey.trim();
      if (provider.type === 'local') body.url = url.trim().replace(/\/$/, '');
      await apiClient.providers.update(provider.id, body);
      toast.success(`${provider.name} configurado com sucesso.`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar configuração.');
    } finally {
      setSaveStage('idle');
    }
  }

  async function handleRemove() {
    if (!confirm(`Remover a configuração de ${provider.name}?`)) return;
    setRemoving(true);
    try {
      await apiClient.providers.removeKey(provider.id);
      toast.success(`Configuração de ${provider.name} removida.`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover configuração.');
    } finally {
      setRemoving(false);
    }
  }

  const saveLabel = saveStage === 'validating'
    ? 'Validando...'
    : saveStage === 'saving'
    ? 'Salvando...'
    : 'Salvar';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b border-border pb-4 mb-2">
          <DialogTitle className="text-base font-semibold">Configurar {provider.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <div>
              <Label className="text-sm font-medium">Provider ativo</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {provider.configured
                  ? 'Quando inativo, os modelos deste provider ficam ocultos'
                  : 'Será ativado automaticamente ao salvar a configuração'}
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={!provider.configured}
            />
          </div>

          {provider.type === 'cloud' ? (
            <CloudProviderForm
              providerName={provider.name}
              value={apiKey}
              onChange={setApiKey}
              error={keyError}
            />
          ) : (
            <LocalProviderForm
              providerName={provider.name}
              url={url}
              onUrlChange={setUrl}
              apiKey={apiKey}
              onApiKeyChange={setApiKey}
              urlError={urlError}
            />
          )}

          <Separator />

          <ProviderTestPanel
            providerId={provider.id}
            candidateKey={apiKey || undefined}
            candidateUrl={provider.type === 'local' ? url || undefined : undefined}
          />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-4 mt-2">
          {provider.configured && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={removing}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              {removing ? 'Removendo...' : 'Remover chave'}
            </Button>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {saveLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
