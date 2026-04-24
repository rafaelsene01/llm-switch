'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import type { ProviderModelInfo, TestResult } from '@/types';

interface ProviderTestPanelProps {
  providerId: string;
  candidateKey?: string;
  candidateUrl?: string;
}

export function ProviderTestPanel({ providerId, candidateKey, candidateUrl }: ProviderTestPanelProps) {
  const [models, setModels] = useState<ProviderModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-fetch models when key/url changes, with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const hasInput = Boolean(candidateKey?.trim()) || Boolean(candidateUrl?.trim());
    if (!hasInput) {
      setModels([]);
      setSelectedModel('');
      setModelsError('');
      setTestResult(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoadingModels(true);
      setModelsError('');
      setTestResult(null);
      try {
        const list = await apiClient.providers.listModels(providerId, {
          key: candidateKey,
          url: candidateUrl,
        });
        setModels(list);
        setSelectedModel(list[0]?.id ?? '');
      } catch (err) {
        setModelsError(err instanceof Error ? err.message : 'Não foi possível conectar ao provider.');
        setModels([]);
        setSelectedModel('');
      } finally {
        setLoadingModels(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [candidateKey, candidateUrl, providerId]);

  async function handleRunTest() {
    if (!selectedModel) return;
    setTesting(true);
    setTestResult(null);
    const result = await apiClient.providers.test(providerId, {
      model: selectedModel,
      key: candidateKey,
      url: candidateUrl,
    });
    setTestResult(result);
    setTesting(false);
  }

  const hasInput = Boolean(candidateKey?.trim()) || Boolean(candidateUrl?.trim());

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">Testar conexão</p>

      {!hasInput && (
        <p className="text-xs text-muted-foreground">
          Informe a chave ou URL para ver os modelos disponíveis.
        </p>
      )}

      {loadingModels && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Carregando modelos...
        </div>
      )}

      {modelsError && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {modelsError}
        </div>
      )}

      {models.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label className="text-xs">{models.length} modelo{models.length !== 1 ? 's' : ''} disponível{models.length !== 1 ? 'is' : ''}</Label>
          <Select value={selectedModel} onValueChange={setSelectedModel} disabled={testing}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecione um modelo" />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleRunTest}
            disabled={!selectedModel || testing}
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Testando...
              </>
            ) : (
              'Executar teste'
            )}
          </Button>
        </div>
      )}

      {testResult && (
        <div className={`flex items-start gap-2 rounded-md p-2 text-xs ${
          testResult.success
            ? 'bg-green-500/10 text-green-700 dark:text-green-400'
            : 'bg-destructive/10 text-destructive'
        }`}>
          {testResult.success ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <div>
            {testResult.success ? (
              <>
                <span className="font-medium">Conexão OK</span> &mdash; &ldquo;{testResult.response}&rdquo;{' '}
                <span className="text-muted-foreground">({testResult.latencyMs}ms)</span>
              </>
            ) : (
              testResult.error
            )}
          </div>
        </div>
      )}
    </div>
  );
}
