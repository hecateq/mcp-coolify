import type { FastifyInstance } from 'fastify';
import { getCoolifyClient } from '../../coolify/client.js';
import {
  normalizeServers,
  normalizeResources,
} from '../../coolify/normalizers.js';
import type { CoolifyServer, CoolifyResource } from '../../coolify/types.js';
import { logger } from '../../observability/logger.js';

export async function serversRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/servers', async (_request, reply) => {
    try {
      const client = getCoolifyClient();
      const res = await client.listServers();
      const servers = normalizeServers(
        (res.data || []) as CoolifyServer[],
      );
      return reply.send({ ok: true, data: servers });
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        'Dashboard: list servers error',
      );
      return reply.status(500).send({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list servers' },
      });
    }
  });

  app.get<{ Params: { uuid: string } }>(
    '/api/servers/:uuid',
    async (request, reply) => {
      try {
        const client = getCoolifyClient();
        const { uuid } = request.params;
        const res = await client.getServer(uuid);
        const data = res.data as Record<string, unknown>;

        // Redact sensitive fields
        const safeData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
          const lowerKey = key.toLowerCase();
          if (
            lowerKey.includes('private_key') ||
            lowerKey.includes('ssh_key') ||
            lowerKey.includes('validation_log')
          ) {
            safeData[key] = '[REDACTED]';
          } else {
            safeData[key] = value;
          }
        }

        return reply.send({ ok: true, data: safeData });
      } catch (error) {
        logger.error(
          { error: (error as Error).message },
          'Dashboard: get server error',
        );
        return reply.status(500).send({
          ok: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get server' },
        });
      }
    },
  );

  app.get<{ Params: { uuid: string } }>(
    '/api/servers/:uuid/resources',
    async (request, reply) => {
      try {
        const client = getCoolifyClient();
        const { uuid } = request.params;
        const res = await client.listServerResources(uuid);
        const resources = normalizeResources(
          (res.data || []) as CoolifyResource[],
        );
        return reply.send({ ok: true, data: resources });
      } catch (error) {
        logger.error(
          { error: (error as Error).message },
          'Dashboard: server resources error',
        );
        return reply.status(500).send({
          ok: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to list server resources',
          },
        });
      }
    },
  );
}
