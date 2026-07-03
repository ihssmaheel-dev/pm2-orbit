import type { FastifyRequest, FastifyReply } from 'fastify';

export function createAuthPlugin() {
  return async function authHook(_req: FastifyRequest, _reply: FastifyReply) {
    // Auth disabled — all requests allowed
  };
}
