// Models
export interface ModelRateLimit {
  amount: number;
  unit: 'tokens' | 'requests';
  interval: 'hourly' | 'daily' | 'weekly';
  intervalHours?: number;
  bufferPercent?: number; // % to keep in reserve; default 10 → use up to 90%
}

export interface GatewayModel {
  id: string;
  value: string;
  label: string;
  active: boolean;
  inputCostPer1M?: number;
  outputCostPer1M?: number;
  rateLimit?: ModelRateLimit;
}

// Users
export interface GatewayUser {
  id: string;
  name: string;
  key: string;
  model: string | null;
  allowedModels: string[];
  createdAt: string;
  active: boolean;
}

export interface UserPublic {
  id: string;
  name: string;
  keyPreview: string;
  model: string | null;
  allowedModels: string[];
  createdAt: string;
  active: boolean;
}

// Providers
export type ProviderType = 'cloud' | 'local';

export interface GatewayProvider {
  id: string;
  providerType: string;
  name: string;
  label?: string;
  type: ProviderType;
  key?: string;
  url?: string;
  configured: boolean;
  enabled: boolean;
}

// Chat
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ChatRequest {
  messages: OpenAIMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  system?: string;
  tools?: OpenAITool[];
  tool_choice?: string | { type: 'function'; function: { name: string } };
}

export interface ChatUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string | null;
    tool_calls?: OpenAIToolCall[];
  };
  finish_reason: string;
}

export interface ChatResponse {
  id: string;
  object: 'chat.completion';
  model: string;
  choices: ChatChoice[];
  usage: ChatUsage;
  gateway: {
    request_id: string;
    provider: string;
  };
}

export interface ApiError {
  error: {
    message: string;
    type: string;
    request_id?: string;
  };
}
