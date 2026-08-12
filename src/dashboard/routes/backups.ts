import type { FastifyInstance } from 'fastify';
import { getCoolifyClient } from '../../coolify/client.js';
import type { CoolifyResource } from '../../coolify/types.js';
import { logger } from '../../observability/logger.js';

export async function backupsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/backups', async (_request, reply) => {
    try {
      const client = getCoolifyClient();

      const resourcesRes = await client.listResources();
      const resources = (resourcesRes.data || []) as CoolifyResource[];
      const databases = resources.filter((r) =>
        [
          'postgresql',
          'mysql',
          'mariadb',
          'mongodb',
          'redis',
          'keydb',
          'dragonfly',
          'clickhouse',
        ].includes(r.type),
      );

      const backupResults = await Promise.allSettled(
        databases.map(async (db) => {
          try {
            const backupRes = await client.listDatabaseBackups(db.uuid);
            return {
              database_uuid: db.uuid,
              database_name: db.name,
              database_type: db.type,
              backups: backupRes.data,
            };
          } catch {
            return {
              database_uuid: db.uuid,
              database_name: db.name,
              database_type: db.type,
              backups: [],
              error: 'Failed to fetch backups',
            };
          }
        }),
      );

      const data = backupResults.map((r) =>
        r.status === 'fulfilled' ? r.value : { error: 'Request failed' },
      );

      return reply.send({ ok: true, data });
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        'Dashboard: backups error',
      );
      return reply.status(500).send({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list backups' },
      });
    }
  });
}
