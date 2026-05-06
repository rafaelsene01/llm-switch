import { Router } from 'express';
import { randomBytes } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import { store } from '../services/store.service';
import { providersDb, ALLOWED_PROVIDER_TYPES } from '../services/providers-db.service';
import type { AllowedProviderType } from '../services/providers-db.service';
import { env } from '../config/env';
import { listProviderModels, testProviderConnection } from '../services/providers.service';
import { getPricingForModel, buildPricingMap } from '../services/pricing.service';

import { activityLog } from '../services/activity-log.service';

const MODULES = ['models', 'users'] as const;
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

  // Analytics
  router.get(
    '/analytics',
    wrap(async (_req, res) => {
      res.json(activityLog.analytics());
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
      const configured = providersDb.list().filter((p) => p.configured);
      const configuredIds = configured.map((p) => p.id);
      const results = await Promise.allSettled(
        configured.map((p) =>
          listProviderModels(p.providerType, p.key, p.url).then((models) =>
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
          error: { message: "Campo 'value' obrigatório (ex: openrouter:anthropic/claude-3.5-sonnet)." },
        });
        return;
      }
      res.status(201).json(store.addModel({ value, label: label ?? value }));
    })
  );

  router.post(
    '/models/sync-prices',
    wrap(async (_req, res) => {
      const litellmMap = await buildPricingMap();
      const models = store.getModels();
      const notFound: string[] = [];
      let updated = 0;
      for (const model of models) {
        const pricing = getPricingForModel(model.value, litellmMap);
        if (pricing) {
          store.updateModel(model.id, pricing);
          updated++;
        } else {
          notFound.push(model.label);
        }
      }
      res.json({ updated, total: models.length, notFound });
    })
  );


  router.patch(
    '/models/:id',
    wrap(async (req, res) => {
      const { active, inputCostPer1M, outputCostPer1M, rateLimit } = req.body as {
        active?: boolean;
        inputCostPer1M?: number;
        outputCostPer1M?: number;
        rateLimit?: import('../types').ModelRateLimit | null;
      };
      const patch: Parameters<typeof store.updateModel>[1] = {};
      if (active !== undefined) patch.active = active;
      if (inputCostPer1M !== undefined) patch.inputCostPer1M = inputCostPer1M;
      if (outputCostPer1M !== undefined) patch.outputCostPer1M = outputCostPer1M;
      if (rateLimit !== undefined) patch.rateLimit = rateLimit ?? undefined;
      const model = store.updateModel(req.params.id, patch);
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
    res.json({ key: 'sk-' + randomBytes(20).toString('hex') });
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
      const providers = providersDb.list().map((p) => ({
        ...p,
        key: p.key ? '***' : undefined,
      }));
      res.json({ providers });
    })
  );

  router.post(
    '/providers',
    wrap(async (req, res) => {
      const { providerType, label } = req.body as { providerType?: string; label?: string };
      if (!providerType) {
        res.status(400).json({ error: { message: "Campo 'providerType' obrigatório." } });
        return;
      }
      if (!(ALLOWED_PROVIDER_TYPES as readonly string[]).includes(providerType)) {
        res.status(400).json({
          error: { message: `Tipo inválido. Use: ${ALLOWED_PROVIDER_TYPES.join(', ')}` },
        });
        return;
      }
      const provider = providersDb.add(providerType as AllowedProviderType, label?.trim() || undefined);
      res.status(201).json({ provider: { ...provider, key: undefined } });
    })
  );

  router.patch(
    '/providers/:id',
    wrap(async (req, res) => {
      const { key, url, enabled, label } = req.body as { key?: string; url?: string; enabled?: boolean; label?: string };
      const patch: { key?: string; url?: string; enabled?: boolean; label?: string } = { key, url };
      if (enabled !== undefined) patch.enabled = enabled;
      if (label !== undefined) patch.label = label?.trim() || undefined;
      const provider = providersDb.update(req.params.id, patch);
      if (!provider) {
        res.status(404).json({ error: { message: 'Provider não encontrado.' } });
        return;
      }
      res.json({ provider: { ...provider, key: provider.key ? '***' : undefined } });
      if (provider.configured) {
        listProviderModels(provider.providerType, provider.key, provider.url)
          .then((models) => store.syncModels(provider.id, models))
          .catch(() => {});
      }
    })
  );

  router.delete(
    '/providers/:id',
    wrap(async (req, res) => {
      const provider = providersDb.getById(req.params.id);
      if (!provider) {
        res.status(404).json({ error: { message: 'Provider não encontrado.' } });
        return;
      }
      store.deleteProviderModels(req.params.id);
      providersDb.remove(req.params.id);
      res.status(204).send();
    })
  );

  router.delete(
    '/providers/:id/key',
    wrap(async (req, res) => {
      if (!providersDb.clearKey(req.params.id)) {
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
      const storedProvider = providersDb.getById(id);
      if (!storedProvider) {
        res.status(404).json({ error: { message: 'Provider não encontrado.' } });
        return;
      }
      const resolvedKey = key ?? storedProvider.key;
      const resolvedUrl = url ?? storedProvider.url;
      try {
        const models = await listProviderModels(storedProvider.providerType, resolvedKey, resolvedUrl);
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
      const storedProvider = providersDb.getById(id);
      if (!storedProvider) {
        res.status(404).json({ error: { message: 'Provider não encontrado.' } });
        return;
      }
      const result = await testProviderConnection(storedProvider.providerType, model, key, url);
      res.json(result);
    })
  );

  // Export/Import full
  router.get(
    '/export',
    wrap(async (_req, res) => {
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(res, store.exportAll(), `llm-switch-config-${date}.json`);
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
        `llm-switch-${module}-${date}.json`
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
      const userFilter = (req.query.user as string | undefined) || undefined;
      const result = activityLog.list(page, limit, userFilter);
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

  router.delete(
    '/activity',
    wrap(async (_req, res) => {
      const deleted = activityLog.deleteAll();
      res.json({ deleted });
    })
  );

  router.delete(
    '/activity/:id',
    wrap(async (req, res) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
      const ok = activityLog.deleteById(id);
      if (!ok) { res.status(404).json({ error: 'Not found' }); return; }
      res.json({ success: true });
    })
  );

  // Audit log (logs/audit.log)
  router.get(
    '/audit-log',
    wrap(async (req, res) => {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
      const clientFilter = (req.query.client as string | undefined) || undefined;
      const statusFilter = (req.query.status as string | undefined) || undefined;

      const OK_MESSAGES = new Set(['request_ok', 'request_sanitized']);
      const WARN_MESSAGES = new Set(['request_blocked']);
      const ERROR_MESSAGES = new Set(['request_failed']);

      const logPath = path.resolve('logs/audit.log');
      if (!existsSync(logPath)) {
        res.json({ entries: [], total: 0, page, limit });
        return;
      }

      const raw = readFileSync(logPath, 'utf8');
      const lines = raw.split('\n').filter(Boolean);

      const entries: Record<string, unknown>[] = [];
      for (const line of lines) {
        try {
          const obj = JSON.parse(line) as Record<string, unknown>;
          if (!obj.requestId) continue;
          if (clientFilter && obj.client !== clientFilter) continue;
          if (statusFilter) {
            const msg = obj.message as string;
            if (statusFilter === 'ok' && !OK_MESSAGES.has(msg)) continue;
            if (statusFilter === 'warn' && !WARN_MESSAGES.has(msg)) continue;
            if (statusFilter === 'error' && !ERROR_MESSAGES.has(msg)) continue;
          }
          entries.push(obj);
        } catch {
          // linha inválida — ignorar
        }
      }

      entries.reverse();

      const total = entries.length;
      const start = (page - 1) * limit;
      const paged = entries.slice(start, start + limit);

      res.json({ entries: paged, total, page, limit });
    })
  );

  return router;
}
