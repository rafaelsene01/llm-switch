'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CloudProviderForm } from './CloudProviderForm';

interface LocalProviderFormProps {
  providerName: string;
  url: string;
  onUrlChange: (v: string) => void;
  apiKey: string;
  onApiKeyChange: (v: string) => void;
  urlError?: string;
}

export function LocalProviderForm({
  providerName,
  url,
  onUrlChange,
  apiKey,
  onApiKeyChange,
  urlError,
}: LocalProviderFormProps) {
  const hasProtocolWarning = url.length > 0 && !url.startsWith('http://') && !url.startsWith('https://');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="provider-url">
          URL Base <span className="text-destructive">*</span>
        </Label>
        <Input
          id="provider-url"
          type="url"
          placeholder="http://localhost:11434"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
        />
        {urlError && <p className="text-xs text-destructive">{urlError}</p>}
        {!urlError && hasProtocolWarning && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            URL deve começar com http:// ou https://
          </p>
        )}
      </div>
      <CloudProviderForm
        providerName={providerName}
        value={apiKey}
        onChange={onApiKeyChange}
      />
      <p className="text-xs text-muted-foreground">
        A API key é opcional para providers locais.
      </p>
    </div>
  );
}
