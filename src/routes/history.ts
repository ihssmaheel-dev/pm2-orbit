import type { FastifyInstance } from 'fastify';
import type { createEventPipeline } from '../core';

type Pipeline = ReturnType<typeof createEventPipeline>;

export async function registerHistoryRoutes(app: FastifyInstance, pipeline: Pipeline) {
  app.get('/api/history/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { hours } = req.query as { hours?: string };
    const processId = parseInt(id, 10);

    if (isNaN(processId)) {
      return reply.code(400).send({ error: 'Invalid process ID' });
    }

    if (!pipeline.persistence) {
      return reply.code(503).send({ error: 'Persistence not available' });
    }

    const hoursNum = hours ? parseInt(hours, 10) : 24;
    if (isNaN(hoursNum) || hoursNum < 1 || hoursNum > 168) {
      return reply.code(400).send({ error: 'Invalid hours parameter (1-168)' });
    }

    return pipeline.persistence.getProcessHistory(processId, hoursNum);
  });

  app.get('/api/history/system', async (req, reply) => {
    const { hours } = req.query as { hours?: string };

    if (!pipeline.persistence) {
      return reply.code(503).send({ error: 'Persistence not available' });
    }

    const hoursNum = hours ? parseInt(hours, 10) : 24;
    if (isNaN(hoursNum) || hoursNum < 1 || hoursNum > 168) {
      return reply.code(400).send({ error: 'Invalid hours parameter (1-168)' });
    }

    return pipeline.persistence.getSystemHistory(hoursNum);
  });
}
