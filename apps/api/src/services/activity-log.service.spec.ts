import os from 'os';
import path from 'path';
import { createActivityLogService } from './activity-log.service';

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const tmpLogs = path.join(os.tmpdir(), `activity-log-test-${Date.now()}`);

function makeService() {
  return createActivityLogService(':memory:', tmpLogs);
}

const baseEntry = {
  requestId: 'req-001',
  userName: 'alice',
  tokenPreview: 'abcd1234',
  originalMessages: [{ role: 'user', content: 'Hello, world!' }],
  sanitizedMessages: [{ role: 'user', content: 'Hello, world!' }],
  llmResponse: 'Hi there!',
  providerModel: 'openai:gpt-4o-mini',
  blocked: false,
  promptTokens: 10,
  completionTokens: 5,
  totalTokens: 15,
  costUsd: 0,
};

describe('ActivityLogService', () => {
  it('starts with an empty log', () => {
    const svc = makeService();
    const { rows, total } = svc.list(1, 10);
    expect(total).toBe(0);
    expect(rows).toHaveLength(0);
  });

  it('inserts a row after log()', () => {
    const svc = makeService();
    svc.log(baseEntry);
    const { rows, total } = svc.list(1, 10);
    expect(total).toBe(1);
    expect(rows[0].request_id).toBe('req-001');
    expect(rows[0].user_name).toBe('alice');
    expect(rows[0].token_preview).toBe('abcd1234');
    expect(rows[0].message_preview).toBe('Hello, world!');
    expect(rows[0].blocked).toBe(false);
  });

  it('stores blocked=true correctly', () => {
    const svc = makeService();
    svc.log({ ...baseEntry, blocked: true, llmResponse: null });
    const { rows } = svc.list(1, 10);
    expect(rows[0].blocked).toBe(true);
  });

  it('truncates message_preview to 200 chars', () => {
    const svc = makeService();
    const long = 'x'.repeat(300);
    svc.log({ ...baseEntry, sanitizedMessages: [{ role: 'user', content: long }] });
    const { rows } = svc.list(1, 10);
    expect(rows[0].message_preview).toHaveLength(203); // 200 + '...'
    expect(rows[0].message_preview.endsWith('...')).toBe(true);
  });

  it('uses the last user message for preview when multiple messages exist', () => {
    const svc = makeService();
    svc.log({
      ...baseEntry,
      sanitizedMessages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'Response' },
        { role: 'user', content: 'Last user message' },
      ],
    });
    const { rows } = svc.list(1, 10);
    expect(rows[0].message_preview).toBe('Last user message');
  });

  it('returns rows in descending created_at order', () => {
    const svc = makeService();
    svc.log({ ...baseEntry, requestId: 'req-001' });
    svc.log({ ...baseEntry, requestId: 'req-002' });
    svc.log({ ...baseEntry, requestId: 'req-003' });
    const { rows } = svc.list(1, 10);
    expect(rows[0].request_id).toBe('req-003');
    expect(rows[2].request_id).toBe('req-001');
  });

  it('paginates correctly', () => {
    const svc = makeService();
    for (let i = 1; i <= 5; i++) svc.log({ ...baseEntry, requestId: `req-${i}` });
    const page1 = svc.list(1, 3);
    const page2 = svc.list(2, 3);
    expect(page1.rows).toHaveLength(3);
    expect(page1.total).toBe(5);
    expect(page2.rows).toHaveLength(2);
  });

  it('deleteOlderThan removes rows older than cutoff', () => {
    const svc = makeService();
    svc.log(baseEntry);
    // days=-1 sets cutoff 1 day in the future, so all existing rows qualify
    const result = svc.deleteOlderThan(-1);
    expect(result.rows).toBe(1);
    const { total } = svc.list(1, 10);
    expect(total).toBe(0);
  });

  it('deleteOlderThan does not remove recent rows', () => {
    const svc = makeService();
    svc.log(baseEntry);
    // days=30 sets cutoff 30 days ago — recent rows should survive
    const result = svc.deleteOlderThan(30);
    expect(result.rows).toBe(0);
    const { total } = svc.list(1, 10);
    expect(total).toBe(1);
  });

  it('does not throw when log() fails internally', () => {
    const svc = makeService();
    expect(() => svc.log({ ...baseEntry, sanitizedMessages: null as unknown as [] })).not.toThrow();
  });

  it('list filters by userFilter (case-insensitive partial match)', () => {
    const svc = makeService();
    svc.log({ ...baseEntry, userName: 'alice', requestId: 'req-a' });
    svc.log({ ...baseEntry, userName: 'bob', requestId: 'req-b' });
    svc.log({ ...baseEntry, userName: 'alice2', requestId: 'req-a2' });
    const { rows, total } = svc.list(1, 10, 'alic');
    expect(total).toBe(2);
    expect(rows.every((r) => r.user_name.toLowerCase().includes('alic'))).toBe(true);
  });

  it('deleteById removes the row and returns true', () => {
    const svc = makeService();
    svc.log(baseEntry);
    const { rows } = svc.list(1, 10);
    const id = rows[0].id;
    expect(svc.deleteById(id)).toBe(true);
    expect(svc.list(1, 10).total).toBe(0);
  });

  it('deleteById returns false for non-existent id', () => {
    const svc = makeService();
    expect(svc.deleteById(9999)).toBe(false);
  });

  it('deleteAll removes all rows and returns count', () => {
    const svc = makeService();
    svc.log({ ...baseEntry, requestId: 'req-1' });
    svc.log({ ...baseEntry, requestId: 'req-2' });
    const deleted = svc.deleteAll();
    expect(deleted).toBe(2);
    expect(svc.list(1, 10).total).toBe(0);
  });

  describe('analytics()', () => {
    it('returns empty arrays when no logs exist', () => {
      const svc = makeService();
      const { byModel, byUser } = svc.analytics();
      expect(byModel).toHaveLength(0);
      expect(byUser).toHaveLength(0);
    });

    it('aggregates byModel with totalCostUsd', () => {
      const svc = makeService();
      svc.log({ ...baseEntry, providerModel: 'openai:gpt-4o', promptTokens: 10, completionTokens: 5, totalTokens: 15, costUsd: 0.001 });
      svc.log({ ...baseEntry, requestId: 'req-002', providerModel: 'openai:gpt-4o', promptTokens: 20, completionTokens: 10, totalTokens: 30, costUsd: 0.002 });
      svc.log({ ...baseEntry, requestId: 'req-003', providerModel: 'anthropic:claude-3', promptTokens: 5, completionTokens: 5, totalTokens: 10, costUsd: 0.0005 });

      const { byModel } = svc.analytics();
      expect(byModel).toHaveLength(2);

      const gpt = byModel.find((m) => m.model === 'openai:gpt-4o')!;
      expect(gpt.requestCount).toBe(2);
      expect(gpt.totalTokens).toBe(45);
      expect(gpt.totalCostUsd).toBeCloseTo(0.003);

      const claude = byModel.find((m) => m.model === 'anthropic:claude-3')!;
      expect(claude.requestCount).toBe(1);
      expect(claude.totalCostUsd).toBeCloseTo(0.0005);
    });

    it('aggregates byUser with totalCostUsd and nested models', () => {
      const svc = makeService();
      svc.log({ ...baseEntry, userName: 'alice', providerModel: 'openai:gpt-4o', totalTokens: 15, costUsd: 0.001 });
      svc.log({ ...baseEntry, requestId: 'req-002', userName: 'alice', providerModel: 'anthropic:claude-3', totalTokens: 10, costUsd: 0.0005 });
      svc.log({ ...baseEntry, requestId: 'req-003', userName: 'bob', providerModel: 'openai:gpt-4o', totalTokens: 20, costUsd: 0.002 });

      const { byUser } = svc.analytics();
      const alice = byUser.find((u) => u.user === 'alice')!;
      expect(alice.requestCount).toBe(2);
      expect(alice.totalTokens).toBe(25);
      expect(alice.totalCostUsd).toBeCloseTo(0.0015);
      expect(alice.models).toHaveLength(2);
      expect(alice.models[0].totalCostUsd).toBeGreaterThan(0);

      const bob = byUser.find((u) => u.user === 'bob')!;
      expect(bob.totalCostUsd).toBeCloseTo(0.002);
    });
  });
});
