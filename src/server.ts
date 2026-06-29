import Fastify from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { createEventPipeline } from './core';
import { createAuthPlugin } from './plugins/auth';
import { registerCors } from './plugins/cors';
import { registerRoutes } from './routes';
import { getSettings, applySettingsToEnv } from './core/persistence/settings';

export interface ServerOpts {
  port: number;
}

export async function createServer(_opts: ServerOpts) {
  const settings = getSettings();
  applySettingsToEnv(settings);

  const app = Fastify({ logger: false, trustProxy: false });

  const distPath = path.join(__dirname, '..', 'dist-ui');
  const isDev = !fs.existsSync(path.join(distPath, 'index.html'));

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: isDev
          ? ["'self'", 'ws:', 'wss:', 'http://127.0.0.1:5151', 'ws://127.0.0.1:5151']
          : ["'self'", 'ws:', 'wss:'],
        fontSrc: ["'self'", 'data:'],
      },
    },
  });

  await app.register(fastifyRateLimit, { max: 100, timeWindow: '1 minute' });

  await registerCors(app);

  const token = process.env.PM2_ORBIT_TOKEN;
  if (token) {
    app.addHook('onRequest', createAuthPlugin());
    console.log('  \x1b[32m✓\x1b[0m Token authentication enabled');
  }

  if (!isDev) {
    await app.register(fastifyStatic, {
      root: distPath,
      prefix: '/',
    });

    const indexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');

    app.setNotFoundHandler((_req, reply) => {
      return reply.type('text/html').send(indexHtml);
    });
  }

  const pipeline = createEventPipeline();

  const wsConnPerIp = new Map<string, number>();
  const MAX_WS_PER_IP = 5;

  app.addHook('onListen', () => {
    const addr = app.server.address();
    const port = typeof addr === 'string' ? 9823 : (addr?.port ?? 9823);
    const host = `http://127.0.0.1:${port}`;
    console.log('');
    console.log('  \x1b[36mPM2 Orbit\x1b[0m server started successfully');
    console.log(`  \x1b[32m→\x1b[0m ${host}`);
    console.log(`  \x1b[90m→\x1b[0m Health: ${host}/api/health`);
    console.log(`  \x1b[90m→\x1b[0m Ping:   ${host}/api/ping`);
    console.log(`  \x1b[90m→\x1b[0m WS:     ws://127.0.0.1:${port}/ws`);
    console.log('');
  });

  await registerRoutes(app, pipeline);

  app.server.on('upgrade', (req, socket, head) => {
    if (req.url === '/ws') {
      const ip = req.socket.remoteAddress || 'unknown';
      const count = wsConnPerIp.get(ip) || 0;
      if (count >= MAX_WS_PER_IP) {
        socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
        socket.destroy();
        return;
      }

      pipeline.wss.handleUpgrade(req, socket, head, (ws) => {
        wsConnPerIp.set(ip, (wsConnPerIp.get(ip) || 0) + 1);
        pipeline.clients.add(ws);

        pipeline.bridge.list().then((snapshots) => {
          ws.send(JSON.stringify({
            ts: Date.now(),
            events: [],
            full: snapshots,
            fullSeq: 1,
            system: require('./core/system/metrics').readSystem(),
          }));
        });

        const decrement = () => {
          pipeline.clients.delete(ws);
          const c = wsConnPerIp.get(ip) || 1;
          if (c <= 1) wsConnPerIp.delete(ip);
          else wsConnPerIp.set(ip, c - 1);
        };

        ws.on('close', decrement);
        ws.on('error', decrement);
      });
    } else {
      socket.destroy();
    }
  });

  pipeline.start();

  await pipeline.bridge.connect().catch((err: Error) => {
    console.log(`  \x1b[33m⚠\x1b[0m PM2 bridge: ${err.message}`);
  });

  async function shutdown(signal: string) {
    console.log(`\n  Received ${signal}. Shutting down gracefully...`);
    pipeline.stop();
    await app.close();
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    process.exit(1);
  });

  return app;
}

if (require.main === module) {
  const port = parseInt(process.env.PM2_ORBIT_PORT || '9823', 10);
  createServer({ port })
    .then((app) => app.listen({ port, host: '127.0.0.1' }))
    .catch((err) => {
      console.error('Failed to start:', err.message);
      process.exit(1);
    });
}
