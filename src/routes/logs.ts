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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const raw = list.find((p: any) => p.pm_id === processId);
          if (raw) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      for (const entry of buffer) {
        try { reply.raw.write(`data: ${JSON.stringify(entry)}\n\n`); } catch { break; }
      }
    }

    const interval = setInterval(() => {
      try {
        if (reply.raw.destroyed || reply.raw.writableEnded) {
          clearInterval(interval);
          tailer.close();
          return;
        }

        reply.raw.write(': keepalive\n\n');

        const buf = tailer.getBuffer();
        if (buf.length > lastSentIndex) {
          const newEntries = buf.slice(lastSentIndex);
          lastSentIndex = buf.length;
          for (const entry of newEntries) {
            reply.raw.write(`data: ${JSON.stringify(entry)}\n\n`);
          }
        }
      } catch {
        clearInterval(interval);
        tailer.close();
      }
    }, 1000);

    req.raw.on('close', () => {
      clearInterval(interval);
      tailer.close();
    });

    return reply;
  });
}
