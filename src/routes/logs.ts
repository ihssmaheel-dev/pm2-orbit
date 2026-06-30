import type { FastifyInstance } from 'fastify';
import type { createEventPipeline } from '../core';
import { parseIdParam } from '../utils/validate';

type Pipeline = ReturnType<typeof createEventPipeline>;

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

    const { createLogTailer } = await import('../core/logs/tailer');
    const tailer = createLogTailer(processId, proc.name, { ...(outLog ? { out: outLog } : {}), ...(errLog ? { err: errLog } : {}) });
    let lastSentIndex = 0;

    const buffer = tailer.getBuffer();
    if (buffer.length > 0) {
      lastSentIndex = buffer.length;
      const batch = buffer.map((e) => JSON.stringify(e)).join('\n');
      try { reply.raw.write(`data: ${batch}\n\n`); } catch { /* */ }
    }

    const interval = setInterval(() => {
      try {
        if (reply.raw.destroyed || reply.raw.writableEnded) {
          clearInterval(interval);
          tailer.close();
          return;
        }

        const buf = tailer.getBuffer();
        if (buf.length > lastSentIndex) {
          const newEntries = buf.slice(lastSentIndex);
          lastSentIndex = buf.length;
          const batch = newEntries.map((e) => JSON.stringify(e)).join('\n');
          reply.raw.write(`data: ${batch}\n\n`);
        } else {
          reply.raw.write(': keepalive\n\n');
        }
      } catch {
        clearInterval(interval);
        tailer.close();
      }
    }, 500);

    req.raw.on('close', () => {
      clearInterval(interval);
      tailer.close();
    });

    return reply;
  });
}
