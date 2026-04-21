'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import type { ProviderModelInfo, TestResult } from '@/types';

type PanelState = 'idle' | 'loading-models' | 'model-select' | 'testing' | 'result';

interface ProviderTestPanelProps {
  providerId: string;
  candidateKey?: string;
  candidateUrl?: string;
}

export function ProviderTestPanel({ providerId, candidateKey, candidateUrl }: ProviderTestPanelProps) {
  const [panelState, setPanelState] = useState<PanelState>('idle');
  const [models, setModels] = useState<ProviderModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [modelsError, setModelsError] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  async function handleFetchModels() {
    setPanelState('loading-models');
    setModelsError('');
    setTestResult(null);
    try {
      const list = await apiClient.providers.listModels(providerId, {
        key: candidateKey,
        url: candidateUrl,
      });
      setModels(list);
      setSelectedModel(list[0]?.id ?? '');
      setPanelState('model-select');
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : 'Não foi possível conectar ao provider.');
      setPanelState('idle');
    }
  }

  async function handleRunTest() {
    if (!selectedModel) return;
    setPanelState('testing');
    setTestResult(null);
    const result = await apiClient.providers.test(providerId, {
      model: selectedModel,
      key: candidateKey,
      url: candidateUrl,
    });
    setTestResult(result);
    setPanelState('result');
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">Testar conexão</p>

      {panelState === 'idle' && (
        <Button type="button" variant="outline" size="sm" onClick={handleFetchModels}>
          <Zap className="mr-2 h-3.5 w-3.5" />
          Buscar modelos disponíveis
        </Button>
      )}

      {panelState === 'loading-models' && (
        <Button type="button" variant="outline" size="sm" disabled>
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          Conectando...
        </Button>
      )}

      {modelsError && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {modelsError}
        </div>
      )}

      {(panelState === 'model-select' || panelState === 'testing' || panelState === 'result') && (
        <div className="flex flex-col gap-2">
          <Label className="text-xs">Modelo para teste</Label>
          <Select value={selectedModel} onValueChange={setSelectedModel} disabled={panelState === 'testing'}>
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
            onClick={handleRunTest}
            disabled={!selectedModel || panelState === 'testing'}
          >
            {panelState === 'testing' ? (
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

      {testResult && panelState === 'result' && (
        <div
          className={`flex items-start gap-2 rounded-md p-2 text-xs ${
            testResult.success
              ? 'bg-green-500/10 text-green-700 dark:text-green-400'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
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

      {(panelState === 'model-select' || panelState === 'result') && (
        <button
          type="button"
          className="self-start text-xs text-muted-foreground underline underline-offset-2"
          onClick={() => { setPanelState('idle'); setModels([]); setTestResult(null); }}
        >
          Resetar teste
        </button>
      )}
    </div>
  );
}
