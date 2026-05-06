import os from 'os';
import path from 'path';
import fs from 'fs';
import { createStore } from './store.service';

function makeTempDb(): string {
  return path.join(os.tmpdir(), `gateway-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function cleanupDb(dbPath: string) {
  for (const suffix of ['', '-wal', '-shm']) {
    const f = dbPath + suffix;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}

// Fake providers db that returns a single configured provider for test isolation
const fakeProviders = {
  list: () => [{ id: 'test', configured: true, enabled: true }],
};

describe('StoreService', () => {
  let tempDb: string;
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    tempDb = makeTempDb();
    store = createStore(tempDb, fakeProviders as never);
  });

  afterEach(() => {
    store.close();
    cleanupDb(tempDb);
  });

  it('deleteModel throws if user is still using it', () => {
    const model = store.addModel({ value: 'test:gpt-test', label: 'Test Model' });
    store.addUser({ name: 'testuser', key: 'sk-test123', model: 'test:gpt-test', allowedModels: [] });

    expect(() => store.deleteModel(model.id)).toThrow('Modelo em uso');
  });

  it('getUserByKey returns correct user and null for missing key', () => {
    store.addUser({ name: 'alice', key: 'sk-alice123', model: null, allowedModels: [] });

    const found = store.getUserByKey('sk-alice123');
    expect(found).not.toBeNull();
    expect(found!.name).toBe('alice');

    const notFound = store.getUserByKey('sk-nonexistent');
    expect(notFound).toBeNull();
  });

  it('exportAll / importAll round-trip preserves models and users', () => {
    store.addModel({ value: 'test:model', label: 'Test Model' });
    store.addUser({ name: 'carol', key: 'sk-carol789', model: null, allowedModels: [] });

    const exported = store.exportAll();

    const tempDb2 = makeTempDb();
    const store2 = createStore(tempDb2, fakeProviders as never);
    store2.importAll(exported, 'replace');

    const models = store2.getModels();
    expect(models.some((m) => m.value === 'test:model')).toBe(true);

    const users = store2.getUsers();
    expect(users.some((u) => u.name === 'carol')).toBe(true);

    store2.close();
    cleanupDb(tempDb2);
  });

  it('addUser and getUsers returns user without key', () => {
    store.addUser({ name: 'bob', key: 'sk-bob456', model: null, allowedModels: [] });
    const users = store.getUsers();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe('bob');
    expect(users[0].keyPreview).toContain('sk-bob4');
  });

  it('updateUser patches fields but not key', () => {
    const user = store.addUser({ name: 'dave', key: 'sk-dave000', model: null, allowedModels: [] });
    const updated = store.updateUser(user.id, { name: 'dave2', active: false, key: 'sk-hacked' });
    expect(updated!.name).toBe('dave2');
    expect(updated!.active).toBe(false);
    // key must remain unchanged
    expect(store.getUserByKey('sk-dave000')).not.toBeNull();
    expect(store.getUserByKey('sk-hacked')).toBeNull();
  });

  it('deleteUser removes user', () => {
    const user = store.addUser({ name: 'eve', key: 'sk-eve111', model: null, allowedModels: [] });
    expect(store.deleteUser(user.id)).toBe(true);
    expect(store.getUsers()).toHaveLength(0);
    expect(store.deleteUser(user.id)).toBe(false);
  });
});
