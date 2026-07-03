import type { FastifyInstance } from 'fastify';
import type { createEventPipeline } from '../core';
import { validateAlertRule } from '../utils/validate';
import type { AlertRule } from '../core/alerts/engine';

type Pipeline = ReturnType<typeof createEventPipeline>;

export async function registerAlertRoutes(app: FastifyInstance, pipeline: Pipeline) {
  app.get('/api/alerts', async () => {
    return pipeline.alerts.getRules();
  });

  app.post('/api/alerts', async (req, reply) => {
    const rule = validateAlertRule(req.body);
    if (!rule) {
      return reply.code(400).send({ error: 'Invalid alert rule. Required: id (string), metric (cpu|memory|restarts|status), operator (>|<|==|>=|<=), threshold (number)' });
    }

    pipeline.alerts.addRule(rule as unknown as AlertRule);
    return { success: true };
  });

  app.delete('/api/alerts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!id || typeof id !== 'string' || id.length === 0) {
      return reply.code(400).send({ error: 'Invalid rule ID' });
    }
    pipeline.alerts.removeRule(id);
    return { success: true };
  });

  app.put('/api/alerts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!id || typeof id !== 'string' || id.length === 0) {
      return reply.code(400).send({ error: 'Invalid rule ID' });
    }
    const updates = req.body as Record<string, unknown>;
    if (!updates || typeof updates !== 'object') {
      return reply.code(400).send({ error: 'Invalid request body' });
    }
    pipeline.alerts.updateRule(id, updates);
    return { success: true };
  });

  app.get('/api/alerts/history', async () => {
    return pipeline.alerts.getHistory();
  });
}
