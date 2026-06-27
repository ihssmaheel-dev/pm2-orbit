import Fastify from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { createEventPipeline } from './core';

export interface ServerOpts {
  port: number;
  remote?: string;
}

export async function createServer(_opts: ServerOpts) {
  const app = Fastify({ logger: false, trustProxy: false });

  const isDev = process.env.NODE_ENV === 'development';

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

  if (!isDev) {
    const distPath = path.join(__dirname, '..', 'dist-ui');

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

  app.get('/api/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    version: require('../package.json').version,
  }));

  app.get('/api/ping', async () => 'pong');

  app.get('/api/system', async () => {
    const { readSystem } = await import('./core/system/metrics');
    return readSystem();
  });

  app.get('/api/processes', async () => {
    return pipeline.bridge.list();
  });

  app.server.on('upgrade', (req, socket, head) => {
    if (req.url === '/ws') {
      pipeline.wss.handleUpgrade(req, socket, head, (ws) => {
        pipeline.clients.add(ws);
        pipeline.bridge.list().then((snapshots) => {
          ws.send(JSON.stringify({
            ts: Date.now(),
            events: [],
            full: snapshots,
            fullHash: pipeline.bridge.computeListHash(snapshots),
            system: require('./core/system/metrics').readSystem(),
          }));
        });
        ws.on('close', () => pipeline.clients.delete(ws));
        ws.on('error', () => pipeline.clients.delete(ws));
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
