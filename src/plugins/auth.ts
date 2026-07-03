import type { FastifyRequest, FastifyReply } from 'fastify';

const SKIP_PATHS = ['/api/health', '/api/ping', '/api/settings'];

export function createAuthPlugin() {
  const token = process.env.PM2_ORBIT_TOKEN;

  return async function authHook(req: FastifyRequest, reply: FastifyReply) {
    if (!token) return;

    const url = req.url.split('?')[0];
    if (SKIP_PATHS.includes(url)) return;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing or invalid authorization header' });
    }

    const providedToken = authHeader.slice(7);
    if (providedToken !== token) {
      return reply.code(403).send({ error: 'Invalid token' });
    }
  };
}
