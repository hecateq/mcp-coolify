import type { FastifyInstance } from 'fastify';
import { getCoolifyClient } from '../../coolify/client.js';
import {
  normalizeProjects,
  normalizeDeployments,
} from '../../coolify/normalizers.js';
import type {
  CoolifyProject,
  CoolifyResource,
  CoolifyDeployment,
} from '../../coolify/types.js';
import { logger } from '../../observability/logger.js';

export async function overviewRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/overview', async (_request, reply) => {
    try {
      const client = getCoolifyClient();

      const [projectsRes, resourcesRes, deploymentsRes] =
        await Promise.allSettled([
          client.listProjects(),
          client.listResources(),
          client.listDeployments({ limit: 20 }),
        ]);

      const projects =
        projectsRes.status === 'fulfilled'
          ? normalizeProjects(
              (projectsRes.value.data || []) as CoolifyProject[],
            )
          : [];
      const resources =
        resourcesRes.status === 'fulfilled'
          ? ((resourcesRes.value.data || []) as CoolifyResource[])
          : [];
      const deployments =
        deploymentsRes.status === 'fulfilled'
          ? normalizeDeployments(
              (deploymentsRes.value.data || []) as CoolifyDeployment[],
            )
          : [];

      const runningResources = resources.filter(
        (r: CoolifyResource) => r.status === 'running',
      ).length;
      const stoppedResources = resources.filter(
        (r: CoolifyResource) => r.status === 'stopped',
      ).length;
      const degradedResources = resources.filter(
        (r: CoolifyResource) => r.status === 'degraded',
      ).length;
      const failedDeployments = deployments.filter(
        (d) => d.status === 'failed',
      ).length;

      const appResources = resources.filter(
        (r: CoolifyResource) => r.type === 'application',
      );
      const svcResources = resources.filter(
        (r: CoolifyResource) => r.type === 'service',
      );
      const dbResources = resources.filter((r: CoolifyResource) =>
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

      return reply.send({
        ok: true,
        data: {
          kpi: {
            projects: projects.length,
            applications: appResources.length,
            services: svcResources.length,
            databases: dbResources.length,
            deployments: deployments.length,
            running: runningResources,
            stopped: stoppedResources,
            degraded: degradedResources,
            failedDeployments,
          },
          recentActivity: deployments.slice(0, 5).map((d) => ({
            resourceName: d.resource_uuid,
            status: d.status,
            when: d.created_at,
            error: d.error,
          })),
        },
      });
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        'Dashboard: overview error',
      );
      return reply.status(500).send({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load overview' },
      });
    }
  });
}
