import crypto from 'crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

const EXEMPT_PREFIXES = ['/api/health', '/', '/assets/', '/favicon', '/sw.js', '/manifest.json', '/.well-known'];

export function createAuthPlugin() {
  const isDev = !require('fs').existsSync(require('path').join(__dirname, '..', 'dist-ui', 'index.html'));

  return async function authHook(req: FastifyRequest, reply: FastifyReply) {
    if (isDev) return;

    const url = req.url.split('?')[0];

    if (EXEMPT_PREFIXES.some((p) => url === p || url.startsWith(p))) return;

    const token = process.env.PM2_ORBIT_TOKEN;
    if (!token) return;

    const authHeader = req.headers.authorization;
    if (authHeader) {
      const provided = authHeader.replace(/^Bearer\s+/i, '');
      if (provided.length === token.length && crypto.timingSafeEqual(
        Buffer.from(provided, 'utf8'),
        Buffer.from(token, 'utf8'),
      )) {
        return;
      }
    }

    return reply.code(401).send({ error: 'Unauthorized' });
  };
}
