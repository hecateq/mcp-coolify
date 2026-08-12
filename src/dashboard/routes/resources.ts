import type { FastifyInstance } from 'fastify';
import { getCoolifyClient } from '../../coolify/client.js';
import {
  normalizeResources,
  normalizeResourceDetail,
} from '../../coolify/normalizers.js';
import type { CoolifyResource } from '../../coolify/types.js';
import { logger } from '../../observability/logger.js';

export async function resourcesRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: {
      project_uuid?: string;
      environment_uuid?: string;
      type?: string;
      status?: string;
      server_uuid?: string;
      search?: string;
    };
  }>('/api/resources', async (request, reply) => {
    try {
      const client = getCoolifyClient();
      const params: Record<string, string | number | undefined> = {};
      if (request.query.project_uuid)
        params['project_uuid'] = request.query.project_uuid;
      if (request.query.environment_uuid)
        params['environment_uuid'] = request.query.environment_uuid;
      if (request.query.type) params['resource_type'] = request.query.type;
      if (request.query.status) params['status'] = request.query.status;
      if (request.query.search) params['search'] = request.query.search;

      const res = await client.listResources(params);
      let resources = normalizeResources(
        (res.data || []) as CoolifyResource[],
      );

      if (request.query.server_uuid) {
        const serverRes = await client.listServerResources(
          request.query.server_uuid,
        );
        const serverResourceUuids = new Set(
          ((serverRes.data || []) as CoolifyResource[]).map((r) => r.uuid),
        );
        resources = resources.filter((r) => serverResourceUuids.has(r.uuid));
      }

      return reply.send({ ok: true, data: resources });
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        'Dashboard: list resources error',
      );
      return reply.status(500).send({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list resources',
        },
      });
    }
  });

  app.get<{ Params: { uuid: string } }>(
    '/api/resources/:uuid',
    async (request, reply) => {
      try {
        const client = getCoolifyClient();
        const { uuid } = request.params;

        // Try to find the resource type first from the resources list
        const listRes = await client.listResources();
        const allResources = (listRes.data || []) as CoolifyResource[];
        const found = allResources.find((r) => r.uuid === uuid);

        if (!found) {
          return reply.status(404).send({
            ok: false,
            error: {
              code: 'RESOURCE_NOT_FOUND',
              message: 'Resource not found',
            },
          });
        }

        let resourceDetail: unknown;
        if (found.type === 'application') {
          resourceDetail = await client.getApplication(uuid);
        } else if (found.type === 'service') {
          resourceDetail = await client.getService(uuid);
        } else {
          resourceDetail = await client.getDatabase(uuid);
        }

        const normalized = normalizeResourceDetail(
          resourceDetail as Record<string, unknown>,
        );

        return reply.send({ ok: true, data: normalized });
      } catch (error) {
        logger.error(
          { error: (error as Error).message },
          'Dashboard: get resource error',
        );
        return reply.status(500).send({
          ok: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get resource' },
        });
      }
    },
  );
}
