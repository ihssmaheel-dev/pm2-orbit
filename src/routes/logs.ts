import type { FastifyInstance } from 'fastify';
import type { createEventPipeline } from '../core';
import { parseIdParam } from '../utils/validate';
import { acquireTailer, releaseTailer } from '../core/logs/tailerRegistry';

type Pipeline = ReturnType<typeof createEventPipeline>;

const POLL_MS = 500;

export async function registerLogRoutes(app: FastifyInstance, pipeline: Pipeline) {
  app.get('/api/logs/history', async () => {
    const bridge = pipeline.bridge;
    const allBuffers = bridge.getAllLogBuffers();
    const result: Record<string, unknown[]> = {};
    for (const [pid, buf] of allBuffers) {
      result[String(pid)] = buf.entries;
    }
    return result;
  });

  app.get('/api/logs/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const processId = parseIdParam(id);
    if (processId === null) return reply.code(400).send({ error: 'Invalid process ID' });

    const bridge = pipeline.bridge;
    const buf = bridge.getLogBuffer(processId);
    let lastSentIndex = buf.length;

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    reply.raw.write('retry: 2000\n\n');

    for (const e of buf) {
      try { reply.raw.write(`data: ${JSON.stringify(e)}\n\n`); } catch { /* */ }
    }

    const interval = setInterval(() => {
      try {
        if (reply.raw.destroyed || reply.raw.writableEnded) {
          clearInterval(interval);
          return;
        }
        const current = bridge.getLogBuffer(processId);
        if (current.length > lastSentIndex) {
          const newEntries = current.slice(lastSentIndex);
          lastSentIndex = current.length;
          for (const e of newEntries) {
            reply.raw.write(`data: ${JSON.stringify(e)}\n\n`);
          }
          return;
        }
        reply.raw.write(': keepalive\n\n');
      } catch {
        clearInterval(interval);
      }
    }, POLL_MS);

    req.raw.on('close', () => clearInterval(interval));

    return reply;
  });

  app.get('/api/logs/stream', async (req, reply) => {
    const bridge = pipeline.bridge;
    const lastPushedMap = new Map<number, number>();

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    reply.raw.write('retry: 2000\n\n');

    // Start tracking from current position — initial history loaded via REST
    const allBuffers = bridge.getAllLogBuffers();
    for (const [pid, buf] of allBuffers) {
      lastPushedMap.set(pid, buf.totalPushed);
    }

    const interval = setInterval(() => {
      try {
        if (reply.raw.destroyed || reply.raw.writableEnded) {
          clearInterval(interval);
          return;
        }
        const current = bridge.getAllLogBuffers();
        let hasData = false;
        for (const [pid, buf] of current) {
          const lastPushed = lastPushedMap.get(pid) || 0;
          const count = buf.totalPushed - lastPushed;
          if (count > 0) {
            // Cap count to buffer size to prevent re-sending old entries
            const effectiveCount = Math.min(count, buf.entries.length);
            const start = Math.max(0, buf.entries.length - effectiveCount);
            const newEntries = buf.entries.slice(start);
            lastPushedMap.set(pid, buf.totalPushed);
            hasData = true;
            for (const e of newEntries) {
              reply.raw.write(`data: ${JSON.stringify(e)}\n\n`);
            }
          }
        }
        if (!hasData) reply.raw.write(': keepalive\n\n');
      } catch {
        clearInterval(interval);
      }
    }, POLL_MS);

    req.raw.on('close', () => clearInterval(interval));

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
