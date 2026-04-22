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
import { Separator } from '@/components/ui/separator';
import { apiClient } from '@/lib/api-client';
import type { GatewayProvider } from '@/types';
import { CloudProviderForm } from './CloudProviderForm';
import { LocalProviderForm } from './LocalProviderForm';
import { ProviderTestPanel } from './ProviderTestPanel';

interface ProviderConfigDialogProps {
  provider: GatewayProvider;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function ProviderConfigDialog({ provider, open, onClose, onSaved }: ProviderConfigDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [url, setUrl] = useState(provider.url ?? '');
  const [keyError, setKeyError] = useState('');
  const [urlError, setUrlError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  function validate(): boolean {
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

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const body: { key?: string; url?: string } = {};
      if (apiKey.trim()) body.key = apiKey.trim();
      if (provider.type === 'local') body.url = url.trim().replace(/\/$/, '');
      await apiClient.providers.update(provider.id, body);
      toast.success(`${provider.name} configurado com sucesso.`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar configuração.');
    } finally {
      setSaving(false);
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b border-border pb-4 mb-2">
          <DialogTitle className="text-base font-semibold">Configurar {provider.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
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
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
