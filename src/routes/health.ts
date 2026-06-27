import type { FastifyInstance } from 'fastify';
import type { createEventPipeline } from '../core';
import { getSettingsSafe, updateSettings, applySettingsToEnv } from '../core/persistence/settings';

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

  app.get('/api/settings', async () => {
    return getSettingsSafe();
  });

  app.put('/api/settings', async (req, reply) => {
    const body = req.body as Partial<import('../core/persistence/settings').Settings>;

    if (!body || typeof body !== 'object') {
      return reply.code(400).send({ error: 'Invalid request body' });
    }

    const allowed = [
      'theme', 'authToken', 'slackWebhookUrl', 'discordWebhookUrl',
      'webhookUrl', 'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass',
      'smtpFrom', 'smtpTo',
    ];

    const filtered: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        filtered[key] = body[key as keyof typeof body];
      }
    }

    const updated = updateSettings(filtered as Partial<import('../core/persistence/settings').Settings>);
    applySettingsToEnv(updated);

    return { success: true, settings: updated };
  });
}
