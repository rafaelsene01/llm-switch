import { Router } from 'express';
import { randomBytes } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import type { Request, Response } from 'express';
import { store } from '../services/store.service';
import { env } from '../config/env';
import type { BlocklistCategory, BlocklistMode } from '../types';
import { listProviderModels, testProviderConnection } from '../services/providers.service';
import { activityLog } from '../services/activity-log.service';

const VALID_MODES = ['disabled', 'redact', 'block'];
const MODULES = ['blocklist', 'models', 'users'] as const;
type Module = (typeof MODULES)[number];

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (err) {
      res.status(400).json({
        error: { message: (err as Error).message, type: 'bad_request' },
      });
    }
  };
}

function downloadJson(res: Response, data: unknown, filename: string) {
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(data);
}

export function createAdminRouter(): Router {
  const router = Router();

  // Auth admin
  router.use((req, res, next) => {
    const adminKey = env.ADMIN_KEY;
    if (!adminKey) return next();
    const token =
      (req.headers['authorization'] ?? '').replace('Bearer ', '').trim() ||
      req.headers['x-api-key'] ||
      '';
    if (token !== adminKey) {
      res.status(403).json({ error: { message: 'Acesso admin negado.', type: 'forbidden' } });
      return;
    }
    next();
  });

  // Config
  router.get(
    '/config',
    wrap(async (_req, res) => {
      res.json({ defaultProvider: null });
    })
  );

  // Blocklist
  router.get(
    '/blocklist',
    wrap(async (_req, res) => {
      res.json(store.getBlocklist());
    })
  );

  router.post(
    '/blocklist',
    wrap(async (req, res) => {
      const { value, type, label, replacement, category, mode } = req.body as Record<
        string,
        string
      >;
      if (!value) {
        res.status(400).json({ error: { message: "Campo 'value' obrigatório." } });
        return;
      }
      if (type === 'regex') {
        try {
          new RegExp(value);
        } catch {
          res.status(400).json({ error: { message: 'Regex inválida.' } });
          return;
        }
      }
      if (mode !== undefined && !VALID_MODES.includes(mode)) {
        res.status(400).json({
          error: { message: `mode inválido. Valores aceitos: ${VALID_MODES.join(', ')}` },
        });
        return;
      }
      res.status(201).json(store.addBlocklistEntry({ value, type: type as 'regex' | 'word', label, replacement, category: category as BlocklistCategory, mode: mode as BlocklistMode }));
    })
  );

  router.patch(
    '/blocklist/:id',
    wrap(async (req, res) => {
      if (req.body.mode !== undefined && !VALID_MODES.includes(req.body.mode)) {
        res.status(400).json({
          error: { message: `mode inválido. Valores aceitos: ${VALID_MODES.join(', ')}` },
        });
        return;
      }
      const entry = store.updateBlocklistEntry(req.params.id, req.body);
      if (!entry) {
        res.status(404).json({ error: { message: 'Entrada não encontrada.' } });
        return;
      }
      res.json(entry);
    })
  );

  router.delete(
    '/blocklist/:id',
    wrap(async (req, res) => {
      if (!store.deleteBlocklistEntry(req.params.id)) {
        res.status(404).json({ error: { message: 'Entrada não encontrada.' } });
        return;
      }
      res.json({ success: true });
    })
  );

  // Models
  router.get(
    '/models',
    wrap(async (_req, res) => {
      res.json(store.getModels());
    })
  );

  router.post(
    '/models/sync',
    wrap(async (_req, res) => {
      const configured = store.getProviders().filter((p) => p.configured);
      const configuredIds = configured.map((p) => p.id);
      const results = await Promise.allSettled(
        configured.map((p) =>
          listProviderModels(p.id, p.key, p.url).then((models) =>
            store.syncModels(p.id, models)
          )
        )
      );
      let added = 0;
      let removed = 0;
      for (const r of results) {
        if (r.status === 'fulfilled') {
          added += r.value.added;
          removed += r.value.removed;
        }
      }
      const pruned = store.pruneUnconfiguredModels(configuredIds);
      removed += pruned.removed;
      res.json({ synced: configured.length, added, removed });
    })
  );

  router.post(
    '/models',
    wrap(async (req, res) => {
      const { value, label } = req.body as { value?: string; label?: string };
      if (!value) {
        res.status(400).json({
          error: { message: "Campo 'value' obrigatório (ex: openai:gpt-4o)." },
        });
        return;
      }
      res.status(201).json(store.addModel({ value, label: label ?? value }));
    })
  );

  router.patch(
    '/models/:id',
    wrap(async (req, res) => {
      const { active } = req.body as { active?: boolean };
      const model = store.updateModel(req.params.id, { active });
      if (!model) {
        res.status(404).json({ error: { message: 'Modelo não encontrado.' } });
        return;
      }
      res.json(model);
    })
  );

  router.delete(
    '/models/:id',
    wrap(async (req, res) => {
      if (!store.deleteModel(req.params.id)) {
        res.status(404).json({ error: { message: 'Modelo não encontrado.' } });
        return;
      }
      res.json({ success: true });
    })
  );

  // Users
  router.get(
    '/users',
    wrap(async (_req, res) => {
      res.json(store.getUsers());
    })
  );

  router.get('/users/generate-key', (_req, res) => {
    res.json({ key: 'gw_' + randomBytes(20).toString('hex') });
  });

  router.post(
    '/users',
    wrap(async (req, res) => {
      const { name, key, model, allowedModels } = req.body as {
        name?: string;
        key?: string;
        model?: string;
        allowedModels?: string[];
      };
      if (!name) {
        res.status(400).json({ error: { message: "Campo 'name' obrigatório." } });
        return;
      }
      if (!key) {
        res.status(400).json({ error: { message: "Campo 'key' obrigatório." } });
        return;
      }
      res.status(201).json(
        store.addUser({ name, key, model: model ?? null, allowedModels: allowedModels ?? [] })
      );
    })
  );

  router.patch(
    '/users/:id',
    wrap(async (req, res) => {
      const user = store.updateUser(req.params.id, req.body);
      if (!user) {
        res.status(404).json({ error: { message: 'Usuário não encontrado.' } });
        return;
      }
      res.json(user);
    })
  );

  router.delete(
    '/users/:id',
    wrap(async (req, res) => {
      if (!store.deleteUser(req.params.id)) {
        res.status(404).json({ error: { message: 'Usuário não encontrado.' } });
        return;
      }
      res.json({ success: true });
    })
  );

  // Providers
  router.get(
    '/providers',
    wrap(async (_req, res) => {
      const providers = store.getProviders().map((p) => ({
        ...p,
        key: p.key ? '***' : undefined,
      }));
      res.json({ providers });
    })
  );

  router.patch(
    '/providers/:id',
    wrap(async (req, res) => {
      const { key, url } = req.body as { key?: string; url?: string };
      const provider = store.updateProvider(req.params.id, { key, url });
      if (!provider) {
        res.status(404).json({ error: { message: 'Provider não encontrado.' } });
        return;
      }
      res.json({ provider: { ...provider, key: provider.key ? '***' : undefined } });
      if (provider.configured) {
        listProviderModels(provider.id, provider.key, provider.url)
          .then((models) => store.syncModels(provider.id, models))
          .catch(() => {});
      }
    })
  );

  router.delete(
    '/providers/:id/key',
    wrap(async (req, res) => {
      if (!store.clearProviderKey(req.params.id)) {
        res.status(404).json({ error: { message: 'Provider não encontrado.' } });
        return;
      }
      res.status(204).send();
    })
  );

  router.get(
    '/providers/:id/models',
    wrap(async (req, res) => {
      const { id } = req.params;
      const { key, url } = req.query as { key?: string; url?: string };
      // Fall back to stored config if no query params provided
      const storedProvider = store.getProviders().find((p) => p.id === id);
      const resolvedKey = key ?? storedProvider?.key;
      const resolvedUrl = url ?? storedProvider?.url;
      try {
        const models = await listProviderModels(id, resolvedKey, resolvedUrl);
        res.json({ models });
      } catch (err) {
        res.status(422).json({
          error: {
            message: err instanceof Error ? err.message : 'Não foi possível conectar ao provider.',
            type: 'provider_error',
          },
        });
      }
    })
  );

  router.post(
    '/providers/:id/test',
    wrap(async (req, res) => {
      const { id } = req.params;
      const { model, key, url } = req.body as { model?: string; key?: string; url?: string };
      if (!model) {
        res.status(400).json({ error: { message: "Campo 'model' obrigatório." } });
        return;
      }
      const result = await testProviderConnection(id, model, key, url);
      res.json(result);
    })
  );

  // Export/Import full
  router.get(
    '/export',
    wrap(async (_req, res) => {
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(res, store.exportAll(), `gateway-config-${date}.json`);
    })
  );

  router.post(
    '/import',
    wrap(async (req, res) => {
      const { payload, mode = 'merge' } = req.body as {
        payload?: unknown;
        mode?: string;
      };
      if (!payload) {
        res.status(400).json({ error: { message: "Campo 'payload' obrigatório." } });
        return;
      }
      if (!['merge', 'replace'].includes(mode)) {
        res.status(400).json({
          error: { message: "mode deve ser 'merge' ou 'replace'." },
        });
        return;
      }
      res.json({
        success: true,
        mode,
        report: store.importAll(payload as Parameters<typeof store.importAll>[0], mode as 'merge' | 'replace'),
      });
    })
  );

  // Export/Import by module
  router.get(
    '/export/:module',
    wrap(async (req, res) => {
      const { module } = req.params;
      if (!MODULES.includes(module as Module)) {
        res.status(400).json({
          error: { message: `Módulo inválido. Use: ${MODULES.join(', ')}` },
        });
        return;
      }
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(
        res,
        store.exportModule(module as Module),
        `gateway-${module}-${date}.json`
      );
    })
  );

  router.post(
    '/import/:module',
    wrap(async (req, res) => {
      const { module } = req.params;
      if (!MODULES.includes(module as Module)) {
        res.status(400).json({
          error: { message: `Módulo inválido. Use: ${MODULES.join(', ')}` },
        });
        return;
      }
      const { payload, mode = 'merge' } = req.body as { payload?: unknown; mode?: string };
      if (!payload) {
        res.status(400).json({ error: { message: "Campo 'payload' obrigatório." } });
        return;
      }
      if (!['merge', 'replace'].includes(mode)) {
        res.status(400).json({
          error: { message: "mode deve ser 'merge' ou 'replace'." },
        });
        return;
      }
      res.json({
        success: true,
        module,
        mode,
        report: store.importModule(
          payload as Parameters<typeof store.importModule>[0],
          module as Module,
          mode as 'merge' | 'replace'
        ),
      });
    })
  );

  // Activity log
  router.get(
    '/activity',
    wrap(async (req, res) => {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const result = activityLog.list(page, limit);
      res.json({ ...result, page, limit });
    })
  );

  router.get(
    '/activity/:id',
    wrap(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const row = activityLog.getById(id);
      if (!row) { res.status(404).json({ error: 'Not found' }); return; }
      let markdown: string | null = null;
      if (row.file_path && existsSync(row.file_path)) {
        markdown = readFileSync(row.file_path, 'utf8');
      }
      res.json({ row, markdown });
    })
  );

  return router;
}
