import os from 'os';
import path from 'path';
import fs from 'fs';
import { createStore } from './store.service';

function makeTempFile(): string {
  return path.join(os.tmpdir(), `gateway-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

describe('StoreService', () => {
  let tempFile: string;
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    tempFile = makeTempFile();
    store = createStore(tempFile);
  });

  afterEach(() => {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });

  it('addBlocklistEntry returns entry with generated id', () => {
    const entry = store.addBlocklistEntry({
      value: 'test-word',
      type: 'word',
      label: 'Test',
      replacement: '[TEST]',
      mode: 'redact',
      category: 'custom',
    });

    expect(entry.id).toMatch(/^bl_/);
    expect(entry.value).toBe('test-word');
    expect(entry.mode).toBe('redact');
  });

  it('updateBlocklistEntry updates field without affecting others', () => {
    const added = store.addBlocklistEntry({
      value: 'original',
      type: 'word',
      label: 'Original Label',
      mode: 'redact',
    });

    const updated = store.updateBlocklistEntry(added.id, { mode: 'block' });

    expect(updated).not.toBeNull();
    expect(updated!.mode).toBe('block');
    expect(updated!.label).toBe('Original Label');
    expect(updated!.value).toBe('original');
  });

  it('deleteModel throws if user is still using it', () => {
    const model = store.addModel({ value: 'openai:gpt-test', label: 'Test Model' });
    store.addUser({ name: 'testuser', key: 'gw_test123', model: 'openai:gpt-test', allowedModels: [] });

    expect(() => store.deleteModel(model.id)).toThrow('Modelo em uso');
  });

  it('getUserByKey returns correct user and null for missing key', () => {
    store.addUser({ name: 'alice', key: 'gw_alice123', model: null, allowedModels: [] });

    const found = store.getUserByKey('gw_alice123');
    expect(found).not.toBeNull();
    expect(found!.name).toBe('alice');

    const notFound = store.getUserByKey('gw_nonexistent');
    expect(notFound).toBeNull();
  });

  it('exportAll / importAll round-trip preserves data', () => {
    store.addBlocklistEntry({ value: 'export-test', type: 'word', label: 'Export Test' });
    store.addModel({ value: 'test:model', label: 'Test Model' });

    const exported = store.exportAll();

    const store2 = createStore(makeTempFile());
    store2.importAll(exported, 'replace');

    const blocklist = store2.getBlocklist();
    expect(blocklist.some((e) => e.value === 'export-test')).toBe(true);

    const models = store2.getModels();
    expect(models.some((m) => m.value === 'test:model')).toBe(true);
  });
});
