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

  app.post('/api/settings/test-webhook', async (req, reply) => {
    const { url, type } = req.body as { url: string; type: 'slack' | 'discord' | 'webhook' };
    if (!url || typeof url !== 'string') return reply.code(400).send({ error: 'URL is required' });

    // Validate URL — only allow http/https, block internal/private IPs
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return reply.code(400).send({ error: 'Invalid URL format' });
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return reply.code(400).send({ error: 'Only HTTP/HTTPS URLs allowed' });
    }

    const hostname = parsed.hostname;
    const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];
    if (blocked.includes(hostname) || hostname.startsWith('10.') || hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) || hostname.endsWith('.local')) {
      return reply.code(400).send({ error: 'Internal/private URLs not allowed' });
    }

    try {
      const payload = type === 'slack'
        ? { text: 'PM2 Orbit test notification' }
        : type === 'discord'
        ? { content: 'PM2 Orbit test notification' }
        : { message: 'PM2 Orbit test notification', type: 'test' };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      return { success: res.ok, status: res.status };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
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
      'smtpFrom', 'smtpTo', 'enabledChannels', 'historyRetentionHours', 'logBufferSize',
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
