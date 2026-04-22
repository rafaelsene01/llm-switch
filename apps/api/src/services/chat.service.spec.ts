import { ChatService } from './chat.service';
import * as providers from '../providers';
import * as ai from 'ai';
import { sanitizer } from './sanitizer.service';
import type { SanitizeFinding, BlocklistFinding } from '../types';

jest.mock('../providers', () => ({
  resolveModel: jest.fn(),
}));

jest.mock('ai', () => ({
  generateText: jest.fn(),
  jsonSchema: jest.fn((s) => s),
}));

jest.mock('./sanitizer.service', () => ({
  sanitizer: {
    sanitizeMessages: jest.fn(),
    sanitizeText: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  logRequest: jest.fn(),
}));

jest.mock('./activity-log.service', () => ({
  activityLog: { log: jest.fn() },
}));

const mockResolveModel = providers.resolveModel as jest.Mock;
const mockGenerateText = ai.generateText as jest.Mock;
const mockSanitizer = sanitizer as jest.Mocked<typeof sanitizer>;

const mockModel = {};

const cleanSanitizeResult = {
  messages: [{ role: 'user' as const, content: 'Hello' }],
  report: [] as Array<{ messageIndex: number; role: string; findings: SanitizeFinding[] }>,
  blocked: false,
  blockFindings: [] as BlocklistFinding[],
};

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    service = new ChatService();
    jest.clearAllMocks();
    mockResolveModel.mockReturnValue(mockModel);
    mockGenerateText.mockResolvedValue({
      text: 'Hello!',
      toolCalls: [],
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });
    mockSanitizer.sanitizeMessages.mockReturnValue(cleanSanitizeResult);
    mockSanitizer.sanitizeText.mockReturnValue({
      sanitized: '',
      findings: [],
      blocked: false,
      blockFindings: [],
    });
  });

  it('returns clean result without sanitizationReport for clean request', async () => {
    const result = await service.complete({
      messages: [{ role: 'user', content: 'Hello', tool_calls: undefined }],
      providerModel: 'openai:gpt-4o-mini',
      clientLabel: 'test-client',
      tokenPreview: 'testprev',
      user: null,
    });

    expect(result.blocked).toBe(false);
    expect(result.sanitizationReport).toHaveLength(0);
    expect(result.text).toBe('Hello!');
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('returns sanitizationReport with findings when CPF is detected', async () => {
    mockSanitizer.sanitizeMessages.mockReturnValue({
      messages: [{ role: 'user' as const, content: 'CPF: [CPF_REMOVIDO]' }],
      report: [
        {
          messageIndex: 0,
          role: 'user',
          findings: [{ label: 'CPF', count: 1 }],
        },
      ],
      blocked: false,
      blockFindings: [],
    });

    const result = await service.complete({
      messages: [{ role: 'user', content: 'CPF: 123.456.789-09' }],
      providerModel: 'openai:gpt-4o-mini',
      clientLabel: 'test-client',
      tokenPreview: 'testprev',
      user: null,
    });

    expect(result.sanitizationReport).toHaveLength(1);
    expect(result.sanitizationReport[0].label).toBe('CPF');
    expect(result.blocked).toBe(false);
  });

  it('returns blocked=true and does not call generateText for blocked request', async () => {
    mockSanitizer.sanitizeMessages.mockReturnValue({
      messages: [{ role: 'user' as const, content: '' }],
      report: [],
      blocked: true,
      blockFindings: [{ ruleId: 'secret', label: 'Palavra Secreta', count: 1 }],
    });

    const result = await service.complete({
      messages: [{ role: 'user', content: 'palavra proibida aqui' }],
      providerModel: 'openai:gpt-4o-mini',
      clientLabel: 'test-client',
      tokenPreview: 'testprev',
      user: null,
    });

    expect(result.blocked).toBe(true);
    expect(result.blockFindings).toHaveLength(1);
    expect(mockGenerateText).not.toHaveBeenCalled();
  });
});
