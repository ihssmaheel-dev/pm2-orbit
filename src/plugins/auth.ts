import type { FastifyRequest, FastifyReply } from 'fastify';

const EXEMPT_PATHS = ['/api/health', '/'];

export function createAuthPlugin() {
  const token = process.env.PM2_ORBIT_TOKEN;
  if (!token) return async function noop() {};

  return async function authHook(req: FastifyRequest, reply: FastifyReply) {
    const url = req.url.split('?')[0];

    // Exempt health check and root
    if (EXEMPT_PATHS.includes(url)) return;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const provided = authHeader.replace(/^Bearer\s+/i, '');
      if (provided === token) return;
    }

    // Check query param (for SSE/EventSource which can't set headers)
    const queryToken = (req.query as Record<string, string>)?.token;
    if (queryToken === token) return;

    return reply.code(401).send({ error: 'Unauthorized' });
  };
}
