'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GatewayModel } from '@/types';

export const NO_MODEL = '__none__';

interface Props {
  model: string;
  allowedModels: string[];
  activeModels: GatewayModel[];
  idPrefix: string;
  onModelChange: (value: string) => void;
  onAllowedModelsChange: (value: string, checked: boolean) => void;
}

export function UserFormFields({
  model,
  allowedModels,
  activeModels,
  idPrefix,
  onModelChange,
  onAllowedModelsChange,
}: Props) {
  return (
    <>
      <div>
        <Label>Modelo padrão</Label>
        <Select value={model || NO_MODEL} onValueChange={onModelChange}>
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_MODEL}>
              <span className="text-muted-foreground">Nenhum (padrão do servidor)</span>
            </SelectItem>
            {activeModels.map((m) => (
              <SelectItem key={m.id} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Modelos permitidos</Label>
        {activeModels.length === 0 ? (
          <p className="mt-1.5 text-xs text-muted-foreground">Nenhum modelo cadastrado</p>
        ) : (
          <div className="mt-1.5 space-y-2 rounded-md border p-3">
            {activeModels.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <Checkbox
                  id={`${idPrefix}-${m.id}`}
                  checked={allowedModels.includes(m.value)}
                  onCheckedChange={(checked) => onAllowedModelsChange(m.value, checked === true)}
                />
                <label
                  htmlFor={`${idPrefix}-${m.id}`}
                  className="flex-1 cursor-pointer text-sm"
                >
                  {m.label}
                  <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                    {m.value}
                  </span>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
