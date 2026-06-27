import type { FastifyInstance } from 'fastify';
import type { createEventPipeline } from '../core';

type Pipeline = ReturnType<typeof createEventPipeline>;

export async function registerRoutes(app: FastifyInstance, pipeline: Pipeline) {
  app.get('/api/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    version: require('../../package.json').version,
    processes: (await pipeline.bridge.list()).length,
  }));

  app.get('/api/ping', async () => 'pong');

  app.get('/api/system', async () => {
    const { readSystem } = await import('../core/system/metrics');
    return readSystem();
  });

  app.get('/api/processes', async () => {
    return pipeline.bridge.list();
  });

  app.get('/api/processes/:id/env', async (req) => {
    const { id } = req.params as { id: string };
    const processId = parseInt(id, 10);

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

  app.get('/api/history/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { hours } = req.query as { hours?: string };
    const processId = parseInt(id, 10);

    if (!pipeline.persistence) {
      return reply.code(503).send({ error: 'Persistence not available' });
    }

    return pipeline.persistence.getProcessHistory(processId, hours ? parseInt(hours, 10) : 24);
  });

  app.get('/api/history/system', async (req, reply) => {
    const { hours } = req.query as { hours?: string };

    if (!pipeline.persistence) {
      return reply.code(503).send({ error: 'Persistence not available' });
    }

    return pipeline.persistence.getSystemHistory(hours ? parseInt(hours, 10) : 24);
  });

  app.get('/api/alerts', async () => {
    return pipeline.alerts.getRules();
  });

  app.post('/api/alerts', async (req, _reply) => {
    const rule = req.body as Parameters<typeof pipeline.alerts.addRule>[0];
    pipeline.alerts.addRule(rule);
    return { success: true };
  });

  app.delete('/api/alerts/:id', async (req) => {
    const { id } = req.params as { id: string };
    pipeline.alerts.removeRule(id);
    return { success: true };
  });

  app.get('/api/alerts/history', async () => {
    return pipeline.alerts.getHistory();
  });

  app.get('/api/settings', async () => ({
    theme: process.env.PM2_ORBIT_THEME || 'dark',
  }));

  app.get('/api/logs/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const processId = parseInt(id, 10);

    const processSnapshots = await pipeline.bridge.list();
    const proc = processSnapshots.find((p) => p.id === processId);
    if (!proc) {
      return reply.code(404).send({ error: 'Process not found' });
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const { createLogTailer } = await import('../core/logs/tailer');
    const tailer = createLogTailer(processId, proc.name);
    let lastSentIndex = 0;

    const interval = setInterval(() => {
      const buffer = tailer.getBuffer();
      if (buffer.length > lastSentIndex) {
        const newEntries = buffer.slice(lastSentIndex);
        lastSentIndex = buffer.length;
        for (const entry of newEntries) {
          reply.raw.write(`data: ${JSON.stringify(entry)}\n\n`);
        }
      }
    }, 1000);

    req.raw.on('close', () => {
      clearInterval(interval);
      tailer.close();
    });

    return reply;
  });
}
