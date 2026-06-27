import type { FastifyInstance } from 'fastify';
import type { createEventPipeline } from '../core';

type Pipeline = ReturnType<typeof createEventPipeline>;

export async function registerHealthRoutes(app: FastifyInstance, pipeline: Pipeline) {
  app.get('/api/health', async () => {
    let pm2Version = 'unknown';
    try {
      const pm2Pkg = require('../../node_modules/pm2/package.json');
      pm2Version = pm2Pkg.version;
    } catch {
      try {
        const pm2Pkg = require('pm2/package.json');
        pm2Version = pm2Pkg.version;
      } catch {
        // pm2 not installed
      }
    }

    return {
      status: 'ok',
      uptime: process.uptime(),
      version: require('../../package.json').version,
      processes: (await pipeline.bridge.list()).length,
      nodeVersion: process.version,
      pm2Version,
    };
  });

  app.get('/api/ping', async () => 'pong');

  app.get('/api/system', async () => {
    const { readSystem } = await import('../core/system/metrics');
    return readSystem();
  });

  app.get('/api/settings', async () => ({
    theme: process.env.PM2_ORBIT_THEME || 'dark',
  }));
}
