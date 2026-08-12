import type { FastifyInstance } from 'fastify';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeDeployments } from '../../coolify/normalizers.js';
import type { CoolifyDeployment } from '../../coolify/types.js';
import { logger } from '../../observability/logger.js';

export async function deploymentsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: {
      status?: string;
      project_uuid?: string;
      resource_uuid?: string;
      limit?: string;
    };
  }>('/api/deployments', async (request, reply) => {
    try {
      const client = getCoolifyClient();
      const params: Record<string, string | number | undefined> = {};
      if (request.query.status) params['status'] = request.query.status;
      if (request.query.resource_uuid)
        params['resource_uuid'] = request.query.resource_uuid;
      const limit = request.query.limit
        ? parseInt(request.query.limit, 10)
        : 20;
      params['limit'] = Math.min(Math.max(limit, 1), 50);

      const res = await client.listDeployments(params);
      const deployments = normalizeDeployments(
        (res.data || []) as CoolifyDeployment[],
      );

      return reply.send({ ok: true, data: deployments });
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        'Dashboard: list deployments error',
      );
      return reply.status(500).send({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list deployments',
        },
      });
    }
  });

  app.get<{ Params: { uuid: string } }>(
    '/api/deployments/:uuid',
    async (request, reply) => {
      try {
        const client = getCoolifyClient();
        const { uuid } = request.params;
        const res = await client.getDeployment(uuid);
        return reply.send({ ok: true, data: res.data });
      } catch (error) {
        logger.error(
          { error: (error as Error).message },
          'Dashboard: get deployment error',
        );
        return reply.status(500).send({
          ok: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get deployment',
          },
        });
      }
    },
  );

  app.post<{ Params: { uuid: string } }>(
    '/api/deployments/:uuid/cancel',
    async (request, reply) => {
      try {
        const client = getCoolifyClient();
        const { uuid } = request.params;
        await client.cancelDeployment(uuid);
        return reply.send({
          ok: true,
          data: { message: 'Deployment cancellation requested' },
        });
      } catch (error) {
        logger.error(
          { error: (error as Error).message },
          'Dashboard: cancel deployment error',
        );
        return reply.status(500).send({
          ok: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to cancel deployment',
          },
        });
      }
    },
  );
}
