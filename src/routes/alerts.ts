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

    // Validate allowed fields
    const allowed = ['scope', 'metric', 'operator', 'threshold', 'severity', 'processId', 'processName', 'enabled', 'channels', 'cooldownMs'];
    const validMetrics = ['cpu', 'memory', 'restarts', 'status', 'systemCpu', 'systemMemory', 'systemLoad'];
    const validOperators = ['>', '<', '==', '>=', '<='];
    const validSeverities = ['info', 'warning', 'critical'];

    const validated: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) {
        const val = updates[key];
        if (key === 'metric' && !validMetrics.includes(val as string)) continue;
        if (key === 'operator' && !validOperators.includes(val as string)) continue;
        if (key === 'severity' && !validSeverities.includes(val as string)) continue;
        if (key === 'threshold' && typeof val !== 'number') continue;
        if (key === 'processId' && typeof val !== 'number') continue;
        if (key === 'enabled' && typeof val !== 'boolean') continue;
        validated[key] = val;
      }
    }

    if (Object.keys(validated).length === 0) {
      return reply.code(400).send({ error: 'No valid fields to update' });
    }

    pipeline.alerts.updateRule(id, validated);
    return { success: true };
  });

  app.get('/api/alerts/history', async () => {
    return pipeline.alerts.getHistory();
  });

  app.delete('/api/alerts/history', async () => {
    pipeline.alerts.clearHistory();
    return { success: true };
  });
}
