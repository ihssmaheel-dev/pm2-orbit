import type { FastifyInstance } from 'fastify';
import type { createEventPipeline } from '../core';

type Pipeline = ReturnType<typeof createEventPipeline>;

export async function registerRoutes(app: FastifyInstance, pipeline: Pipeline) {
  const { registerHealthRoutes } = await import('./health');
  const { registerProcessRoutes } = await import('./processes');
  const { registerHistoryRoutes } = await import('./history');
  const { registerAlertRoutes } = await import('./alerts');
  const { registerLogRoutes } = await import('./logs');

  registerHealthRoutes(app, pipeline);
  registerProcessRoutes(app, pipeline);
  registerHistoryRoutes(app, pipeline);
  registerAlertRoutes(app, pipeline);
  registerLogRoutes(app, pipeline);
}
