export type BlocklistMode = 'disabled' | 'redact' | 'block';

export type BlocklistCategory =
  | 'documento'
  | 'contato'
  | 'financeiro'
  | 'credencial'
  | 'saude'
  | 'rede'
  | 'custom';

export interface BlocklistEntry {
  id: string;
  label: string;
  value: string;
  type: 'regex' | 'word';
  replacement: string;
  mode: BlocklistMode;
  builtin: boolean;
  category: BlocklistCategory;
}

export interface GatewayModel {
  id: string;
  value: string;
  label: string;
  active: boolean;
}

export interface GatewayUser {
  id: string;
  name: string;
  key: string;
  model: string | null;
  allowedModels: string[];
  createdAt: string;
  active: boolean;
}

export type ProviderType = 'cloud' | 'local';

export interface GatewayProvider {
  id: string;
  name: string;
  type: ProviderType;
  key?: string;
  url?: string;
  configured: boolean;
}

export interface ProviderModelInfo {
  id: string;
  name: string;
}

export type TestResult =
  | { success: true; response: string; latencyMs: number }
  | { success: false; error: string };

export interface UserPublic {
  id: string;
  name: string;
  keyPreview: string;
  model: string | null;
  allowedModels: string[];
  createdAt: string;
  active: boolean;
}
