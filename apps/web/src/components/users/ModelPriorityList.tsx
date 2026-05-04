'use client';

import { ChevronUp, ChevronDown, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { GatewayModel } from '@/types';

interface Props {
  allowedModels: string[];
  activeModels: GatewayModel[];
  onChange: (models: string[]) => void;
}

export function ModelPriorityList({ allowedModels, activeModels, onChange }: Props) {
  const modelMap = new Map(activeModels.map((m) => [m.value, m]));
  const available = activeModels.filter((m) => !allowedModels.includes(m.value));

  function move(index: number, dir: -1 | 1) {
    const next = [...allowedModels];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function remove(value: string) {
    onChange(allowedModels.filter((m) => m !== value));
  }

  function add(value: string) {
    onChange([...allowedModels, value]);
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-field-label">Fila de prioridade</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          O sistema usa o primeiro modelo com quota disponível, na ordem abaixo.
        </p>
        {allowedModels.length === 0 ? (
          <div className="mt-1.5 rounded-md border border-dashed px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground">Nenhum modelo adicionado</p>
          </div>
        ) : (
          <div className="mt-1.5 rounded-md border divide-y overflow-hidden">
            {allowedModels.map((value, index) => {
              const model = modelMap.get(value);
              return (
                <div key={value} className="flex items-center gap-2 px-3 py-2 bg-background hover:bg-muted/30 transition-colors">
                  <span className="text-xs text-muted-foreground font-mono w-4 shrink-0 text-center select-none">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{model?.label ?? value}</span>
                    <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                      {value}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      title="Mover para cima"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === allowedModels.length - 1}
                      onClick={() => move(index, 1)}
                      title="Mover para baixo"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(value)}
                      title="Remover"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {available.length > 0 && (
        <div>
          <Label className="text-field-label text-muted-foreground">Adicionar à fila</Label>
          <div className="mt-1.5 rounded-md border divide-y overflow-hidden">
            {available.map((model) => (
              <div key={model.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-muted-foreground">{model.label}</span>
                  <span className="ml-1.5 font-mono text-xs text-muted-foreground/60">
                    {model.value}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => add(model.value)}
                  title="Adicionar à fila"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
