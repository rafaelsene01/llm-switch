import { SanitizerService } from './sanitizer.service';
import { store } from './store.service';
import type { BlocklistEntry } from '../types';

jest.mock('./store.service', () => ({
  store: {
    getBlocklist: jest.fn(),
  },
}));

const mockedStore = store as jest.Mocked<typeof store>;

function makeEntry(overrides: Partial<BlocklistEntry>): BlocklistEntry {
  return {
    id: 'test_rule',
    label: 'Test Rule',
    value: 'test',
    type: 'word',
    replacement: '[REMOVED]',
    mode: 'redact',
    builtin: false,
    category: 'custom',
    ...overrides,
  };
}

describe('SanitizerService', () => {
  let service: SanitizerService;

  beforeEach(() => {
    service = new SanitizerService();
    jest.clearAllMocks();
  });

  it('sanitizeText redacts CPF with redact mode', () => {
    mockedStore.getBlocklist.mockReturnValue([
      makeEntry({
        id: 'builtin_cpf',
        label: 'CPF',
        value: '\\b\\d{3}[.\\-]?\\d{3}[.\\-]?\\d{3}[.\\-]?\\d{2}\\b',
        type: 'regex',
        replacement: '[CPF_REMOVIDO]',
        mode: 'redact',
      }),
    ]);

    const result = service.sanitizeText('Meu CPF é 123.456.789-09');

    expect(result.sanitized).toContain('[CPF_REMOVIDO]');
    expect(result.blocked).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].label).toBe('CPF');
  });

  it('sanitizeText returns blocked=true with block mode', () => {
    mockedStore.getBlocklist.mockReturnValue([
      makeEntry({
        id: 'secret_rule',
        label: 'Palavra Secreta',
        value: 'segredo',
        type: 'word',
        mode: 'block',
      }),
    ]);

    const result = service.sanitizeText('Isso contém segredo confidencial');

    expect(result.blocked).toBe(true);
    expect(result.blockFindings).toHaveLength(1);
    expect(result.blockFindings[0].label).toBe('Palavra Secreta');
  });

  it('sanitizeText ignores disabled rules', () => {
    mockedStore.getBlocklist.mockReturnValue([
      makeEntry({
        value: 'senhasupersecreta',
        type: 'word',
        mode: 'disabled',
      }),
    ]);

    const result = service.sanitizeText('Minha senhasupersecreta aqui');

    expect(result.sanitized).toBe('Minha senhasupersecreta aqui');
    expect(result.findings).toHaveLength(0);
    expect(result.blocked).toBe(false);
  });

  it('sanitizeMessages processes array of messages and returns report', () => {
    mockedStore.getBlocklist.mockReturnValue([
      makeEntry({
        id: 'builtin_email',
        label: 'E-mail',
        value: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}',
        type: 'regex',
        replacement: '[EMAIL_REMOVIDO]',
        mode: 'redact',
      }),
    ]);

    const messages = [
      { role: 'user', content: 'Meu email é user@example.com' },
      { role: 'assistant', content: 'Obrigado!' },
    ];

    const result = service.sanitizeMessages(messages);

    expect(result.report).toHaveLength(1);
    expect(result.report[0].messageIndex).toBe(0);
    expect(result.messages[0].content).toContain('[EMAIL_REMOVIDO]');
    expect(result.blocked).toBe(false);
  });

  it('sanitizeMessages sets blocked=true if any message has a block match', () => {
    mockedStore.getBlocklist.mockReturnValue([
      makeEntry({
        value: 'proibido',
        type: 'word',
        mode: 'block',
        label: 'Palavra Proibida',
      }),
    ]);

    const messages = [
      { role: 'user', content: 'Isso é proibido aqui' },
      { role: 'user', content: 'Outra mensagem normal' },
    ];

    const result = service.sanitizeMessages(messages);

    expect(result.blocked).toBe(true);
    expect(result.blockFindings).toHaveLength(1);
  });
});
