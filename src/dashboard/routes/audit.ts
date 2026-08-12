import type { FastifyInstance } from 'fastify';
import { logger } from '../../observability/logger.js';
import { getAuditEvents } from '../../observability/audit.js';

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: {
      action?: string;
      resource?: string;
      project?: string;
      result?: string;
      limit?: string;
      before?: string;
    };
  }>('/api/audit', async (request, reply) => {
    try {
      const events = getAuditEvents({
        action: request.query.action,
        resource: request.query.resource,
        project: request.query.project,
        result: request.query.result,
        limit: request.query.limit
          ? parseInt(request.query.limit, 10)
          : undefined,
      });

      return reply.send({ ok: true, data: events });
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        'Dashboard: audit error',
      );
      return reply.status(500).send({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get audit events',
        },
      });
    }
  });
}
