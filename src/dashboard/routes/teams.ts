import type { FastifyInstance } from 'fastify';
import { getCoolifyClient } from '../../coolify/client.js';
import {
  normalizeTeam,
  normalizeTeamMembers,
} from '../../coolify/normalizers.js';
import type {
  CoolifyTeam,
  CoolifyTeamMember,
} from '../../coolify/types.js';
import { logger } from '../../observability/logger.js';

export async function teamsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/teams/current', async (_request, reply) => {
    try {
      const client = getCoolifyClient();
      const res = await client.getCurrentTeam();
      const team = normalizeTeam(res.data as CoolifyTeam);
      return reply.send({ ok: true, data: team });
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        'Dashboard: current team error',
      );
      return reply.status(500).send({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get current team' },
      });
    }
  });

  app.get('/api/teams/current/members', async (_request, reply) => {
    try {
      const client = getCoolifyClient();
      const res = await client.listTeamMembers();
      const members = normalizeTeamMembers(
        (res.data || []) as CoolifyTeamMember[],
      );
      return reply.send({ ok: true, data: members });
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        'Dashboard: team members error',
      );
      return reply.status(500).send({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list team members',
        },
      });
    }
  });
}
