import type { FastifyInstance } from 'fastify';
import type { createEventPipeline } from '../core';
import { getSettingsSafe, getSettings, updateSettings, applySettingsToEnv } from '../core/persistence/settings';
import type { NotificationChannel, Settings } from '../core/persistence/settings';

type Pipeline = ReturnType<typeof createEventPipeline>;

function channelConfigured(ch: NotificationChannel, settings: Settings): boolean {
  switch (ch) {
    case 'browser': return true;
    case 'slack': return !!settings.slackWebhookUrl;
    case 'discord': return !!settings.discordWebhookUrl;
    case 'webhook': return !!settings.webhookUrl;
    case 'email': return !!settings.smtpHost && !!settings.smtpFrom && !!settings.smtpTo;
  }
}

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

  app.get('/api/channels', async () => {
    const settings = getSettings();
    const channels: NotificationChannel[] = ['browser', 'slack', 'discord', 'webhook', 'email'];
    const result: Record<string, { configured: boolean; enabled: boolean }> = {};

    for (const ch of channels) {
      const configured = channelConfigured(ch, settings);
      const enabled = settings.enabledChannels[ch] !== false;
      result[ch] = { configured, enabled };
    }

    return result;
  });

  app.put('/api/settings', async (req, reply) => {
    const body = req.body as Partial<import('../core/persistence/settings').Settings>;

    if (!body || typeof body !== 'object') {
      return reply.code(400).send({ error: 'Invalid request body' });
    }

    const allowed = [
      'theme', 'authToken', 'slackWebhookUrl', 'discordWebhookUrl',
      'webhookUrl', 'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass',
      'smtpFrom', 'smtpTo', 'enabledChannels',
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
