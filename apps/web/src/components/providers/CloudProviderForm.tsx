'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface CloudProviderFormProps {
  providerName: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

export function CloudProviderForm({ providerName, value, onChange, error }: CloudProviderFormProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="provider-key">
        API Key <span className="text-destructive">*</span>
      </Label>
      <div className="relative">
        <Input
          id="provider-key"
          type={show ? 'text' : 'password'}
          placeholder={`Chave de API do ${providerName}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
          autoComplete="off"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
