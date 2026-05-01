import { ChatService } from './chat.service';
import * as providers from '../providers';
import * as ai from 'ai';

jest.mock('../providers', () => ({
  resolveModel: jest.fn(),
}));

jest.mock('ai', () => ({
  generateText: jest.fn(),
  jsonSchema: jest.fn((s) => s),
}));

jest.mock('../utils/logger', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  logRequest: jest.fn(),
}));

jest.mock('./activity-log.service', () => ({
  activityLog: { log: jest.fn() },
}));

jest.mock('./store.service', () => ({
  store: { getModels: jest.fn(() => []) },
}));

const mockResolveModel = providers.resolveModel as jest.Mock;
const mockGenerateText = ai.generateText as jest.Mock;

const mockModel = {};

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
  });

  it('calls generateText and returns result', async () => {
    const result = await service.complete({
      messages: [{ role: 'user', content: 'Hello', tool_calls: undefined }],
      providerModel: 'openai:gpt-4o-mini',
      clientLabel: 'test-client',
      tokenPreview: 'testprev',
      user: null,
    });

    expect(result.text).toBe('Hello!');
    expect(result.finishReason).toBe('stop');
    expect(result.usage.totalTokens).toBe(15);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('throws when generateText fails', async () => {
    mockGenerateText.mockRejectedValue(new Error('provider down'));

    await expect(
      service.complete({
        messages: [{ role: 'user', content: 'Hello' }],
        providerModel: 'openai:gpt-4o-mini',
        clientLabel: 'test-client',
        tokenPreview: 'testprev',
        user: null,
      })
    ).rejects.toThrow('provider down');
  });

  it('passes system prompt to generateText', async () => {
    await service.complete({
      messages: [{ role: 'user', content: 'Hello' }],
      providerModel: 'openai:gpt-4o-mini',
      clientLabel: 'test-client',
      tokenPreview: 'testprev',
      user: null,
      system: 'You are helpful.',
    });

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ system: 'You are helpful.' })
    );
  });
});
