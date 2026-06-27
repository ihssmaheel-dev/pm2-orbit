import Fastify from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'path';

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
    await app.register(fastifyStatic, {
      root: path.join(__dirname, 'dist-ui'),
      prefix: '/',
      decorateReply: false,
    });

    app.setNotFoundHandler((_req, reply) => {
      return reply.sendFile('index.html');
    });
  }

  app.addHook('onListen', () => {
    const addr = app.server.address();
    const host = typeof addr === 'string' ? addr : `http://127.0.0.1:${addr?.port}`;
    console.log('');
    console.log('  \x1b[36mPM2 Orbit\x1b[0m server started successfully');
    console.log(`  \x1b[32m→\x1b[0m ${host}`);
    console.log(`  \x1b[90m→\x1b[0m Health: ${host}/api/health`);
    console.log(`  \x1b[90m→\x1b[0m Ping:   ${host}/api/ping`);
    console.log('');
  });

  app.get('/api/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    version: require('../package.json').version,
  }));

  app.get('/api/ping', async () => 'pong');

  async function shutdown(signal: string) {
    console.log(`\n  Received ${signal}. Shutting down gracefully...`);
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
