import type { FastifyRequest, FastifyReply } from 'fastify';

const EXEMPT_PATHS = ['/api/health', '/'];

export function createAuthPlugin() {
  const token = process.env.PM2_ORBIT_TOKEN;
  if (!token) return async function noop() {};

  // Detect dev mode — skip auth when Vite proxy is running
  const isDev = !require('fs').existsSync(require('path').join(__dirname, '..', 'dist-ui', 'index.html'));

  return async function authHook(req: FastifyRequest, reply: FastifyReply) {
    if (isDev) return;

    const url = req.url.split('?')[0];

    if (EXEMPT_PATHS.includes(url)) return;

    const authHeader = req.headers.authorization;
    if (authHeader) {
      const provided = authHeader.replace(/^Bearer\s+/i, '');
      if (provided === token) return;
    }

    const queryToken = (req.query as Record<string, string>)?.token;
    if (queryToken === token) return;

    return reply.code(401).send({ error: 'Unauthorized' });
  };
}
