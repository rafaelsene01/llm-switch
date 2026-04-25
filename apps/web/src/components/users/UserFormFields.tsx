'use client';

import { AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GatewayModel, SanitizationRoles } from '@/types';

export const NO_MODEL = '__none__';

export const DEFAULT_SANITIZATION_ROLES: SanitizationRoles = {
  system: true,
  user: true,
  tool: true,
};

interface Props {
  model: string;
  allowedModels: string[];
  activeModels: GatewayModel[];
  idPrefix: string;
  sanitizationRoles: SanitizationRoles;
  onModelChange: (value: string) => void;
  onAllowedModelsChange: (value: string, checked: boolean) => void;
  onSanitizationRolesChange: (roles: SanitizationRoles) => void;
}

const ROLE_LABELS: { key: keyof SanitizationRoles; label: string; description: string }[] = [
  { key: 'system', label: 'System', description: 'Sanitiza mensagens com role system' },
  { key: 'user', label: 'User', description: 'Sanitiza mensagens com role user' },
  { key: 'tool', label: 'Tool', description: 'Sanitiza respostas de ferramentas (tool)' },
];

export function UserFormFields({
  model,
  allowedModels,
  activeModels,
  idPrefix,
  sanitizationRoles,
  onModelChange,
  onAllowedModelsChange,
  onSanitizationRolesChange,
}: Props) {
  return (
    <>
      <div>
        <Label>Modelo padrão</Label>
        <Select value={model || undefined} onValueChange={onModelChange}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Selecione um modelo" />
          </SelectTrigger>
          <SelectContent>
            {activeModels.map((m) => (
              <SelectItem key={m.id} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {model && !activeModels.some((m) => m.value === model) && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            Modelo <span className="font-mono">{model}</span> não encontrado — selecione outro
          </p>
        )}
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

      <div>
        <Label>Sanitização de mensagens</Label>
        <div className="mt-1.5 space-y-2 rounded-md border p-3">
          {ROLE_LABELS.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </div>
              <Switch
                id={`${idPrefix}-sanitize-${key}`}
                checked={sanitizationRoles[key]}
                onCheckedChange={(checked) =>
                  onSanitizationRolesChange({ ...sanitizationRoles, [key]: checked })
                }
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
