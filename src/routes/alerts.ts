import type { FastifyInstance } from 'fastify';
import type { createEventPipeline } from '../core';

type Pipeline = ReturnType<typeof createEventPipeline>;

export async function registerAlertRoutes(app: FastifyInstance, pipeline: Pipeline) {
  app.get('/api/alerts', async () => {
    return pipeline.alerts.getRules();
  });

  app.post('/api/alerts', async (req, reply) => {
    const rule = req.body as { id?: string; metric?: string; operator?: string; threshold?: number; enabled?: boolean };

    if (!rule || typeof rule !== 'object') {
      return reply.code(400).send({ error: 'Invalid request body' });
    }

    if (!rule.id || typeof rule.id !== 'string') {
      return reply.code(400).send({ error: 'Missing or invalid id' });
    }

    const validMetrics = ['cpu', 'memory', 'restarts', 'status'];
    if (!rule.metric || !validMetrics.includes(rule.metric)) {
      return reply.code(400).send({ error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}` });
    }

    const validOperators = ['>', '<', '==', '>=', '<='];
    if (!rule.operator || !validOperators.includes(rule.operator)) {
      return reply.code(400).send({ error: `Invalid operator. Must be one of: ${validOperators.join(', ')}` });
    }

    if (typeof rule.threshold !== 'number' || isNaN(rule.threshold)) {
      return reply.code(400).send({ error: 'Invalid threshold' });
    }

    pipeline.alerts.addRule(rule as Parameters<typeof pipeline.alerts.addRule>[0]);
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
}
