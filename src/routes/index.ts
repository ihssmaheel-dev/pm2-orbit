import type { FastifyInstance } from 'fastify';
import type { createEventPipeline } from '../core';
import { registerHealthRoutes } from './health';
import { registerProcessRoutes } from './processes';
import { registerHistoryRoutes } from './history';
import { registerAlertRoutes } from './alerts';
import { registerLogRoutes } from './logs';

type Pipeline = ReturnType<typeof createEventPipeline>;

export async function registerRoutes(app: FastifyInstance, pipeline: Pipeline) {
  registerHealthRoutes(app, pipeline);
  registerProcessRoutes(app, pipeline);
  registerHistoryRoutes(app, pipeline);
  registerAlertRoutes(app, pipeline);
  registerLogRoutes(app, pipeline);
}
