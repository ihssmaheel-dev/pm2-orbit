import type { FastifyInstance } from 'fastify';
import type { createEventPipeline } from '../core';

type Pipeline = ReturnType<typeof createEventPipeline>;

export async function registerProcessRoutes(app: FastifyInstance, pipeline: Pipeline) {
  app.get('/api/processes', async () => {
    return pipeline.bridge.list();
  });

  app.get('/api/processes/:id/env', async (req) => {
    const { id } = req.params as { id: string };
    const processId = parseInt(id, 10);

    if (isNaN(processId)) {
      return {};
    }

    try {
      const pm2Module = require('pm2');
      return new Promise((resolve) => {
        pm2Module.list((err: Error | null, list: unknown[]) => {
          if (err) return resolve({});
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const proc = list.find((p: any) => p.pm_id === processId);
          if (!proc) return resolve({});
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const env = (proc as any).pm2_env || {};
          const envVars: Record<string, string> = {};
          for (const [key, value] of Object.entries(env)) {
            if (typeof value === 'string') {
              envVars[key] = value;
            }
          }
          resolve(envVars);
        });
      });
    } catch {
      return {};
    }
  });

  app.post('/api/processes/:id/action', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { action, instances } = req.body as { action: string; instances?: number };
    const processId = parseInt(id, 10);

    if (isNaN(processId)) {
      return reply.code(400).send({ error: 'Invalid process ID' });
    }

    const validActions = ['restart', 'stop', 'start', 'reload', 'delete', 'scale', 'flush'];
    if (!action || !validActions.includes(action)) {
      return reply.code(400).send({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
    }

    try {
      const pm2Module = require('pm2');
      const actionFn = {
        restart: (cb: (err: Error | null) => void) => pm2Module.restart(processId, cb),
        stop: (cb: (err: Error | null) => void) => pm2Module.stop(processId, cb),
        start: (cb: (err: Error | null) => void) => pm2Module.start(processId, cb),
        reload: (cb: (err: Error | null) => void) => pm2Module.reload(processId, cb),
        delete: (cb: (err: Error | null) => void) => pm2Module.delete(processId, cb),
        scale: (cb: (err: Error | null) => void) => pm2Module.scale(processId, instances || 1, cb),
        flush: (cb: (err: Error | null) => void) => pm2Module.flush(processId, cb),
      }[action];

      if (!actionFn) {
        return reply.code(400).send({ error: `Unknown action: ${action}` });
      }

      await new Promise<void>((resolve, reject) => {
        actionFn((err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return { success: true };
    } catch (err) {
      return reply.code(500).send({ error: (err as Error).message });
    }
  });
}
