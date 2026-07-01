import type { FastifyInstance } from 'fastify';
import type { createEventPipeline } from '../core';
import { parseIdParam } from '../utils/validate';
import { acquireTailer, releaseTailer } from '../core/logs/tailerRegistry';

type Pipeline = ReturnType<typeof createEventPipeline>;

const POLL_MS = 500;

export async function registerLogRoutes(app: FastifyInstance, pipeline: Pipeline) {
  app.get('/api/logs/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const processId = parseIdParam(id);
    if (processId === null) return reply.code(400).send({ error: 'Invalid process ID' });

    const processSnapshots = await pipeline.bridge.list();
    const proc = processSnapshots.find((p) => p.id === processId);
    if (!proc) {
      return reply.code(404).send({ error: 'Process not found' });
    }

    let outLog: string | undefined;
    let errLog: string | undefined;

    try {
      const pm2Module = require('pm2');
      await new Promise<void>((resolve) => {
        pm2Module.list((_err: Error | null, list: unknown[]) => {
          const raw = list.find((p: any) => p.pm_id === processId);
          if (raw) {
            const env = (raw as any).pm2_env || {};
            outLog = env.pm_out_log_path;
            errLog = env.pm_err_log_path;
          }
          resolve();
        });
      });
    } catch {
      // fall through, tailer will guess paths
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    reply.raw.write('retry: 2000\n\n');

    const tailer = acquireTailer(processId, proc.name, { ...(outLog ? { out: outLog } : {}), ...(errLog ? { err: errLog } : {}) });
    let lastSentIndex = 0;

    {
      const { entries } = tailer.getNewEntries(0);
      if (entries.length > 0) {
        lastSentIndex = entries.length;
        const batch = entries.map((e) => JSON.stringify(e)).join('\n');
        try { reply.raw.write(`data: ${batch}\n\n`); } catch { /* */ }
      }
    }

    const interval = setInterval(() => {
      try {
        if (reply.raw.destroyed || reply.raw.writableEnded) {
          clearInterval(interval);
          releaseTailer(processId);
          return;
        }

        const { entries, total } = tailer.getNewEntries(lastSentIndex);
        if (entries.length > 0) {
          lastSentIndex = total;
          const batch = entries.map((e) => JSON.stringify(e)).join('\n');
          reply.raw.write(`data: ${batch}\n\n`);
        } else {
          reply.raw.write(': keepalive\n\n');
        }
      } catch {
        clearInterval(interval);
        releaseTailer(processId);
      }
    }, POLL_MS);

    req.raw.on('close', () => {
      clearInterval(interval);
      releaseTailer(processId);
    });

    return reply;
  });

  app.get('/api/logs/stream', async (req, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    reply.raw.write('retry: 2000\n\n');

    const processSnapshots = await pipeline.bridge.list();

    const logPaths = new Map<number, { out?: string; err?: string }>();
    try {
      const pm2Module = require('pm2');
      await new Promise<void>((resolve) => {
        pm2Module.list((_err: Error | null, list: unknown[]) => {
          for (const raw of (list || []) as any[]) {
            const env = raw.pm2_env || {};
            logPaths.set(raw.pm_id, {
              out: env.pm_out_log_path,
              err: env.pm_err_log_path,
            });
          }
          resolve();
        });
      });
    } catch {}

    const active: { tailer: ReturnType<typeof acquireTailer>; lastIndex: number; pid: number; name: string }[] = [];

    for (const proc of processSnapshots) {
      const paths = logPaths.get(proc.id);
      const tailer = acquireTailer(proc.id, proc.name, paths);
      const { entries, total } = tailer.getNewEntries(0);
      active.push({ tailer, lastIndex: total, pid: proc.id, name: proc.name });

      if (entries.length > 0) {
        const batch = entries.map((e) => JSON.stringify({ ...e, processId: proc.id, processName: proc.name })).join('\n');
        try { reply.raw.write(`data: ${batch}\n\n`); } catch { /* */ }
      }
    }

    const interval = setInterval(() => {
      try {
        if (reply.raw.destroyed || reply.raw.writableEnded) {
          clearInterval(interval);
          for (const t of active) releaseTailer(t.pid);
          return;
        }

        let hasData = false;
        for (const t of active) {
          const { entries, total } = t.tailer.getNewEntries(t.lastIndex);
          if (entries.length > 0) {
            t.lastIndex = total;
            hasData = true;
            const batch = entries.map((e) => JSON.stringify({ ...e, processId: t.pid, processName: t.name })).join('\n');
            try { reply.raw.write(`data: ${batch}\n\n`); } catch { /* */ }
          }
        }

        if (!hasData) {
          reply.raw.write(': keepalive\n\n');
        }
      } catch {
        clearInterval(interval);
        for (const t of active) releaseTailer(t.pid);
      }
    }, POLL_MS);

    req.raw.on('close', () => {
      clearInterval(interval);
      for (const t of active) releaseTailer(t.pid);
    });

    return reply;
  });

  app.get('/api/logs/debug/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const processId = parseIdParam(id);
    if (processId === null) return reply.code(400).send({ error: 'Invalid process ID' });

    const processSnapshots = await pipeline.bridge.list();
    const proc = processSnapshots.find((p) => p.id === processId);
    if (!proc) return reply.code(404).send({ error: 'Process not found' });

    const tailer = acquireTailer(processId, proc.name);
    const buf = tailer.getBuffer();
    const entries = buf.map((e) => ({
      ts: new Date(e.ts).toISOString(),
      stream: e.stream,
      messageLen: e.message.length,
      preview: e.message.slice(0, 200),
      hasNewline: e.message.includes('\n'),
    }));
    releaseTailer(processId);
    return reply.send({ processId, processName: proc.name, total: buf.length, entries });
  });
}
