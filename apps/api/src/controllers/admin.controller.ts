import { Router } from 'express';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { store } from '../services/store.service';
import { env } from '../config/env';
import type { BlocklistCategory, BlocklistMode } from '../types';

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
      res.json({ defaultProvider: env.DEFAULT_PROVIDER });
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

  return router;
}
