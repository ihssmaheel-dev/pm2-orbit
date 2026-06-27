import type { FastifyInstance } from 'fastify';
import type { createEventPipeline } from '../core';

type Pipeline = ReturnType<typeof createEventPipeline>;

export async function registerLogRoutes(app: FastifyInstance, pipeline: Pipeline) {
  app.get('/api/logs/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const processId = parseInt(id, 10);

    if (isNaN(processId)) {
      return reply.code(400).send({ error: 'Invalid process ID' });
    }

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
