import type { FastifyInstance } from 'fastify';
import { getAllNotes, setNote, deleteNote } from '../core/persistence/notes';

export async function registerNoteRoutes(app: FastifyInstance) {
  app.get('/api/notes', async () => {
    return getAllNotes();
  });

  app.put('/api/notes/:processName', async (req, reply) => {
    const { processName } = req.params as { processName: string };
    if (!processName) return reply.code(400).send({ error: 'Process name is required' });

    const body = req.body as { note?: string };
    if (body.note === undefined || typeof body.note !== 'string') {
      return reply.code(400).send({ error: 'note string is required' });
    }

    setNote(processName, body.note);
    return { success: true };
  });

  app.delete('/api/notes/:processName', async (req, reply) => {
    const { processName } = req.params as { processName: string };
    if (!processName) return reply.code(400).send({ error: 'Process name is required' });

    deleteNote(processName);
    return { success: true };
  });
}
