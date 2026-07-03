import type { FastifyRequest, FastifyReply } from 'fastify';

const SKIP_PATHS = ['/api/health', '/api/ping', '/api/settings'];

export function createAuthPlugin() {
  return async function authHook(_req: FastifyRequest, _reply: FastifyReply) {
    // Auth disabled — all requests allowed
  };
}
