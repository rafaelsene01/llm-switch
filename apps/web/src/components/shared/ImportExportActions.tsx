'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';
import { apiClient, type ImportModule, type ImportResult } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const MODULE_LABELS: Record<'all' | ImportModule, string> = {
  all: 'config global',
  blocklist: 'regras',
  users: 'usuários',
  providers: 'providers',
};

interface ImportExportActionsProps {
  module: 'all' | ImportModule;
  onImportSuccess?: () => void;
  className?: string;
}

export function ImportExportActions({ module, onImportSuccess, className }: ImportExportActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [pendingPayload, setPendingPayload] = useState<unknown>(null);
  const [pendingFilename, setPendingFilename] = useState('');

  const label = MODULE_LABELS[module];

  async function handleExport() {
    setExporting(true);
    try {
      if (module === 'all') {
        await apiClient.export.all();
      } else {
        await apiClient.export.module(module);
      }
    } catch (err) {
      toast.error(`Erro ao exportar ${label}: ${(err as Error).message}`);
    } finally {
      setExporting(false);
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo permitido: 5 MB.');
      return;
    }

    let parsed: unknown;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch {
      toast.error('Arquivo inválido: não é um JSON válido.');
      return;
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !(parsed as Record<string, unknown>)['_gateway_export']
    ) {
      toast.error('Arquivo inválido: não é uma exportação do LLM Gateway.');
      return;
    }

    setPendingPayload(parsed);
    setPendingFilename(file.name);
    setMode('merge');
    setDialogOpen(true);
  }

  async function handleConfirmImport() {
    setImporting(true);
    try {
      let result: ImportResult;
      if (module === 'all') {
        result = await apiClient.import.all(pendingPayload, mode);
      } else {
        result = await apiClient.import.module(pendingPayload, module, mode);
      }
      const { report } = result;
      const parts = Object.entries(report.added)
        .filter(([, n]) => n > 0)
        .map(([mod, n]) => `${n} ${mod} adicionado${n !== 1 ? 's' : ''}`)
        .join(', ');
      const skippedTotal = Object.values(report.skipped).reduce((a, b) => a + b, 0);
      const summary = [parts, skippedTotal > 0 ? `${skippedTotal} ignorado${skippedTotal !== 1 ? 's' : ''}` : '']
        .filter(Boolean)
        .join(' · ') || 'Nenhuma alteração';
      toast.success(`Importação concluída: ${summary}`);
      setDialogOpen(false);
      onImportSuccess?.();
    } catch (err) {
      toast.error(`Erro ao importar: ${(err as Error).message}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className={`flex items-center gap-2 ${className ?? ''}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {exporting ? 'Exportando…' : 'Exportar'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleImportClick}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Importar
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar {label}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Arquivo: <span className="font-medium text-foreground">{pendingFilename}</span>
            </p>

            <div className="space-y-1.5">
              <Label>Modo de importação</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as 'merge' | 'replace')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">
                    Mesclar — adiciona novos, mantém existentes
                  </SelectItem>
                  <SelectItem value="replace">
                    Substituir — substitui todos os dados existentes
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === 'replace' && (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                Atenção: o modo Substituir apagará todos os {label} atuais.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={importing}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmImport} disabled={importing}>
              {importing ? 'Importando…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
