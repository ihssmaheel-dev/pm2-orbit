import type { FastifyInstance } from 'fastify';
import type { createEventPipeline } from '../core';

type Pipeline = ReturnType<typeof createEventPipeline>;

export async function registerHealthRoutes(app: FastifyInstance, pipeline: Pipeline) {
  app.get('/api/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    version: require('../../package.json').version,
    processes: (await pipeline.bridge.list()).length,
    nodeVersion: process.version,
  }));

  app.get('/api/ping', async () => 'pong');

  app.get('/api/system', async () => {
    const { readSystem } = await import('../core/system/metrics');
    return readSystem();
  });

  app.get('/api/settings', async () => ({
    theme: process.env.PM2_ORBIT_THEME || 'dark',
  }));
}
