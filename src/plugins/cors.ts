import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

const DEFAULT_ORIGINS = ['http://127.0.0.1:9823', 'http://localhost:9823'];

export async function registerCors(app: FastifyInstance) {
  const envOrigins = process.env.CORS_ORIGINS;
  const origin = envOrigins
    ? envOrigins.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_ORIGINS;

  await app.register(cors, {
    origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
}
