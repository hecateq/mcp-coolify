import type { FastifyInstance } from 'fastify';
import { getToolRegistry } from '../tools-registry.js';
import { logger } from '../../observability/logger.js';

export async function toolsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/tools', async (_request, reply) => {
    try {
      const tools = getToolRegistry();
      return reply.send({
        ok: true,
        data: tools,
      });
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        'Dashboard: tools error',
      );
      return reply.status(500).send({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list tools' },
      });
    }
  });
}
