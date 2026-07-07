import type { FastifyInstance } from 'fastify';
import * as tags from '../core/persistence/tags';

export async function registerTagRoutes(app: FastifyInstance) {
  app.get('/api/tags', async () => {
    return tags.getTags();
  });

  app.post('/api/tags', async (req, reply) => {
    const body = req.body as { name?: string; color?: string };
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return reply.code(400).send({ error: 'Tag name is required' });
    }
    const color = body.color || '#6366f1';
    const tag = tags.createTag(body.name.trim(), color);
    return tag;
  });

  app.put('/api/tags/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { name?: string; color?: string };
    const updates: Record<string, string> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.color !== undefined) updates.color = body.color;
    const ok = tags.updateTag(id, updates);
    if (!ok) return reply.code(404).send({ error: 'Tag not found' });
    return { success: true };
  });

  app.delete('/api/tags/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const ok = tags.deleteTag(id);
    if (!ok) return reply.code(404).send({ error: 'Tag not found' });
    return { success: true };
  });

  app.post('/api/tags/assign', async (req, reply) => {
    const body = req.body as { processName?: string; tagIds?: string[] };
    if (!body.processName || typeof body.processName !== 'string') {
      return reply.code(400).send({ error: 'processName is required' });
    }
    const tagIds = Array.isArray(body.tagIds) ? body.tagIds : [];
    tags.assignTagsToProcess(body.processName, tagIds);
    return { success: true };
  });

  app.get('/api/tags/assignments', async () => {
    const data = tags.getTagData();
    return data.assignments;
  });
}
