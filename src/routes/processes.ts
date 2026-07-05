import type { FastifyInstance } from 'fastify';
import type { createEventPipeline } from '../core';
import { parseIdParam } from '../utils/validate';

type Pipeline = ReturnType<typeof createEventPipeline>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pm2Module: any = null;
try { pm2Module = require('pm2'); } catch { /* pm2 not installed */ }

const VALID_ACTIONS = ['restart', 'stop', 'start', 'reload', 'delete', 'scale', 'flush'];

export async function registerProcessRoutes(app: FastifyInstance, pipeline: Pipeline) {
  app.get('/api/processes', async () => {
    return pipeline.bridge.list();
  });

  app.get('/api/processes/:id/env', async (req) => {
    const { id } = req.params as { id: string };
    const processId = parseIdParam(id);
    if (processId === null) return {};

    try {
      if (!pm2Module) return {};
      return new Promise((resolve) => {
        pm2Module.list((err: Error | null, list: unknown[]) => {
          if (err) return resolve({});
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const proc = list.find((p: any) => p.pm_id === processId);
          if (!proc) return resolve({});
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const env = (proc as any).pm2_env || {};
          const envVars: Record<string, string> = {};

          const systemVars = new Set([
            'PATH', 'PATHEXT', 'SYSTEMROOT', 'SYSTEMDRIVE', 'WINDIR',
            'TEMP', 'TMP', 'USERPROFILE', 'USERNAME', 'USERDOMAIN',
            'USERDOMAIN_ROAMINGPROFILE', 'PROCESSOR_ARCHITECTURE',
            'PROCESSOR_IDENTIFIER', 'PROCESSOR_LEVEL', 'PROCESSOR_REVISION',
            'PROGRAMDATA', 'PROGRAMFILES', 'PROGRAMW6432',
            'COMMONPROGRAMFILES', 'COMMONPROGRAMW6432', 'COMPUTERNAME',
            'COMSPEC', 'DRIVERDATA', 'HOMEDRIVE', 'HOMEPATH',
            'LOCALAPPDATA', 'LOGONSERVER', 'NUMBER_OF_PROCESSORS',
            'ONEDRIVE', 'OS', 'PSMODULEPATH', 'PUBLIC', 'SESSIONNAME',
            'ALLUSERSPROFILE', 'APPDATA', 'COLORTERM', 'LANG',
            'TERM', 'TERM_PROGRAM', 'TERM_PROGRAM_VERSION',
            'ZES_ENABLE_SYSMAN', 'ZED_TERM', 'ZED_ENVIRONMENT',
            'PM2_USAGE', 'PM2_JSON_PROCESSING',
          ]);

          for (const [key, value] of Object.entries(env)) {
            if (typeof value === 'string' && !systemVars.has(key) && !key.startsWith('MIMOCODE_') && !key.startsWith('FPS_BROWSER_') && !key.startsWith('EFC_')) {
              envVars[key] = value;
            }
          }
          resolve(envVars);
        });
      });
    } catch {
      return {};
    }
  });

  app.post('/api/processes/:id/action', async (req, reply) => {
    const { id } = req.params as { id: string };
    const processId = parseIdParam(id);
    if (processId === null) return reply.code(400).send({ error: 'Invalid process ID' });

    const body = req.body as Record<string, unknown>;
    const action = typeof body?.action === 'string' ? body.action : '';
    const instances = typeof body?.instances === 'number' ? body.instances : undefined;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return reply.code(400).send({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` });
    }

    try {
      if (!pm2Module) return reply.code(500).send({ error: 'PM2 not available' });

      if (action === 'scale') {
        const name = await new Promise<string>((resolve, reject) => {
          pm2Module.list((err: Error | null, list: { name: string; pm_id: number }[]) => {
            if (err) return reject(err);
            const proc = list.find((p) => p.pm_id === processId);
            if (!proc) return reject(new Error('Process not found'));
            resolve(proc.name);
          });
        });
        await new Promise<void>((resolve, reject) => {
          pm2Module.scale(name, instances !== undefined ? String(instances) : '+1', (err: Error | null) => {
            if (err) reject(err);
            else resolve();
          });
        });
        return { success: true };
      }

      const actionFn = {
        restart: (cb: (err: Error | null) => void) => pm2Module.restart(processId, cb),
        stop: (cb: (err: Error | null) => void) => pm2Module.stop(processId, cb),
        start: (cb: (err: Error | null) => void) => pm2Module.start(processId, cb),
        reload: (cb: (err: Error | null) => void) => pm2Module.reload(processId, cb),
        delete: (cb: (err: Error | null) => void) => pm2Module.delete(processId, cb),
        flush: (cb: (err: Error | null) => void) => pm2Module.flush(processId, cb),
      }[action];

      if (!actionFn) {
        return reply.code(400).send({ error: `Unknown action: ${action}` });
      }

      await new Promise<void>((resolve, reject) => {
        actionFn((err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return { success: true };
    } catch (err) {
      return reply.code(500).send({ error: (err as Error).message });
    }
  });
}
