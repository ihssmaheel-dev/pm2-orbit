import Fastify from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import os from 'os';

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

  function getSystemSnapshot() {
    const cpus = os.cpus();
    let idle = 0, total = 0;
    for (const cpu of cpus) {
      const { user, nice, sys, irq, idle: cpuIdle } = cpu.times;
      idle += cpuIdle;
      total += user + nice + sys + irq + cpuIdle;
    }
    const cpuPercent = total === 0 ? 0 : Math.round((1 - idle / total) * 1000) / 10;
    return {
      cpu: cpuPercent,
      memory: { used: os.totalmem() - os.freemem(), total: os.totalmem() },
      loadAvg: os.loadavg() as [number, number, number],
      disk: { read: 0, write: 0 },
      network: { rx: 0, tx: 0 },
    };
  }

  const wss = new WebSocketServer({ noServer: true });

  app.server.on('upgrade', (req, socket, head) => {
    if (req.url === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);

    ws.send(JSON.stringify({
      ts: Date.now(),
      events: [],
      system: getSystemSnapshot(),
    }));

    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });

  const tickInterval = setInterval(() => {
    if (clients.size === 0) return;
    const tick = JSON.stringify({
      ts: Date.now(),
      events: [],
      system: getSystemSnapshot(),
    });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(tick);
      }
    }
  }, 2000);

  app.get('/api/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    version: require('../package.json').version,
  }));

  app.get('/api/ping', async () => 'pong');

  app.get('/api/system', async () => getSystemSnapshot());

  async function shutdown(signal: string) {
    console.log(`\n  Received ${signal}. Shutting down gracefully...`);
    clearInterval(tickInterval);
    for (const client of clients) client.close();
    wss.close();
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
