import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

export async function registerCors(app: FastifyInstance) {
  const envOrigins = process.env.CORS_ORIGINS;
  const host = process.env.PM2_ORBIT_HOST;

  let origin: string | string[] | boolean;

  if (envOrigins) {
    origin = envOrigins.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (host && host !== '127.0.0.1' && host !== 'localhost') {
    // Remote access: require explicit CORS_ORIGINS for security.
    // Fall back to no cross-origin requests (same-origin only).
    origin = false;
  } else {
    origin = ['http://127.0.0.1:9823', 'http://localhost:9823'];
  }

  await app.register(cors, {
    origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
}
