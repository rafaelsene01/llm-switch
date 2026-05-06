'use client';

import { useRef, useState } from 'react';
import { GripVertical, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { GatewayModel } from '@/types';

interface Props {
  allowedModels: string[];
  activeModels: GatewayModel[];
  onChange: (models: string[]) => void;
}

function getProviderBase(instanceId: string) {
  return instanceId.replace(/_\d+$/, '');
}

function deduplicateAvailable(models: GatewayModel[], allowedModels: string[]): GatewayModel[] {
  const seen = new Set<string>();
  const result: GatewayModel[] = [];
  for (const model of models) {
    if (allowedModels.includes(model.value)) continue;
    const [instanceId, ...rest] = model.value.split(':');
    const modelName = rest.join(':');
    const key = `${getProviderBase(instanceId)}:${modelName}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(model);
    }
  }
  return result;
}

export function ModelPriorityList({ allowedModels, activeModels, onChange }: Props) {
  const modelMap = new Map(activeModels.map((m) => [m.value, m]));
  const available = deduplicateAvailable(activeModels, allowedModels);

  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function remove(value: string) {
    onChange(allowedModels.filter((m) => m !== value));
  }

  function add(value: string) {
    onChange([...allowedModels, value]);
  }

  function handleDragStart(index: number) {
    dragIndex.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOver(index);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === dropIndex) {
      dragIndex.current = null;
      setDragOver(null);
      return;
    }
    const next = [...allowedModels];
    const [item] = next.splice(from, 1);
    next.splice(dropIndex, 0, item);
    onChange(next);
    dragIndex.current = null;
    setDragOver(null);
  }

  function handleDragEnd() {
    dragIndex.current = null;
    setDragOver(null);
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-field-label">Fila de prioridade</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          O sistema usa o primeiro modelo com quota disponível, na ordem abaixo. Arraste para reordenar.
        </p>
        {allowedModels.length === 0 ? (
          <div className="mt-1.5 rounded-md border border-dashed px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground">Nenhum modelo adicionado</p>
          </div>
        ) : (
          <div className="mt-1.5 rounded-md border divide-y overflow-hidden">
            {allowedModels.map((value, index) => {
              const model = modelMap.get(value);
              const isOver = dragOver === index;
              return (
                <div
                  key={value}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 bg-background transition-colors select-none',
                    isOver ? 'bg-muted/60 border-t-2 border-t-primary' : 'hover:bg-muted/30',
                  )}
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 cursor-grab active:cursor-grabbing" />
                  <span className="text-xs text-muted-foreground font-mono w-4 shrink-0 text-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{model?.label ?? value}</span>
                    <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                      {value}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(value)}
                    title="Remover"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
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
