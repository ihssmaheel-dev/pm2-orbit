import Fastify from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCompress from '@fastify/compress';
import fastifyStatic from '@fastify/static';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { createEventPipeline } from './core';
import { createAuthPlugin } from './plugins/auth';
import { registerCors } from './plugins/cors';
import { registerRoutes } from './routes';
import { getSettings, applySettingsToEnv } from './core/persistence/settings';
import { logger } from './utils/logger';

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
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    originAgentCluster: false,
  });

  await app.register(fastifyRateLimit, { max: 100, timeWindow: '1 minute' });

  await app.register(fastifyCompress, { global: true });

  await registerCors(app);

  app.addHook('onRequest', (req, reply, done) => {
    const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    (req as any)._reqId = reqId;
    (req as any)._start = Date.now();
    reply.header('X-Request-Id', reqId);
    done();
  });

  app.addHook('onResponse', (req, reply, done) => {
    const duration = Date.now() - ((req as any)._start || Date.now());
    const reqId = (req as any)._reqId;
    logger.info(`[${reqId}] ${req.method} ${req.url} ${reply.statusCode} ${duration}ms`);
    done();
  });

  const token = process.env.PM2_ORBIT_TOKEN;
  if (token) {
    app.addHook('onRequest', createAuthPlugin());
    logger.info('Token authentication enabled');
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
    const pkg = require('../package.json');

    console.log('');
    console.log('  \x1b[1m\x1b[36mPM2 Orbit\x1b[0m \x1b[90mv' + pkg.version + '\x1b[0m');
    console.log('');
    console.log('  \x1b[32m→\x1b[0m ' + host);
    console.log('  \x1b[90mHealth:\x1b[0m ' + host + '/api/health');
    console.log('  \x1b[90mWS:    \x1b[0m ws://127.0.0.1:' + port + '/ws');
    console.log('');

    // Check for updates
    fetch('https://registry.npmjs.org/pm2-orbit/latest')
      .then((r) => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((data: any) => {
        if (data.version && data.version !== pkg.version) {
          console.log('  \x1b[33m⬆\x1b[0m \x1b[33mUpdate available: v' + data.version + '\x1b[0m');
          console.log('  \x1b[90mRun: npm install -g pm2-orbit@latest\x1b[0m');
          console.log('');
        }
      })
      .catch(() => {});
  });

  await registerRoutes(app, pipeline);

  app.server.on('upgrade', (req, socket, head) => {
    if (req.url === '/ws') {
      // Check WS auth if token is set
      if (token) {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const queryToken = url.searchParams.get('token');
        const authHeader = req.headers.authorization;
        const headerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;
        if (queryToken !== token && headerToken !== token) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
      }

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

  await Promise.race([
    pipeline.bridge.connect(),
    new Promise<void>((_, reject) => setTimeout(() => reject(new Error('PM2 connection timed out after 10s')), 10_000)),
  ]).catch((err: Error) => {
    logger.warn(`PM2 bridge: ${err.message}`);
  });

  async function shutdown(signal: string) {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    pipeline.stop();
    await app.close();
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    // Handle better-sqlite3 native module errors gracefully
    if (err.message && err.message.includes('Could not locate the bindings file')) {
      logger.warn('better-sqlite3 native bindings not available — using in-memory history');
      return; // Don't exit, continue without SQLite
    }
    logger.error('Uncaught exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
    process.exit(1);
  });

  return app;
}

if (require.main === module) {
  const port = parseInt(process.env.PM2_ORBIT_PORT || '9823', 10);
  createServer({ port })
    .then((app) => app.listen({ port, host: '127.0.0.1' }))
    .catch((err) => {
      logger.error('Failed to start:', err.message);
      process.exit(1);
    });
}
