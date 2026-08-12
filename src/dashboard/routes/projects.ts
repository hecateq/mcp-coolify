import type { FastifyInstance } from 'fastify';
import { getCoolifyClient } from '../../coolify/client.js';
import {
  normalizeProjects,
  normalizeEnvironments,
  normalizeResources,
  normalizeDeployments,
} from '../../coolify/normalizers.js';
import type {
  CoolifyProject,
  CoolifyEnvironment,
  CoolifyResource,
  CoolifyDeployment,
} from '../../coolify/types.js';
import { logger } from '../../observability/logger.js';

export async function projectsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/projects', async (_request, reply) => {
    try {
      const client = getCoolifyClient();
      const res = await client.listProjects();
      const projects = normalizeProjects(
        (res.data || []) as CoolifyProject[],
      );
      return reply.send({ ok: true, data: projects });
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        'Dashboard: list projects error',
      );
      return reply.status(500).send({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list projects' },
      });
    }
  });

  app.get<{ Params: { uuid: string } }>(
    '/api/projects/:uuid',
    async (request, reply) => {
      try {
        const client = getCoolifyClient();
        const { uuid } = request.params;

        const [projectRes, envsRes, resourcesRes, deploymentsRes] =
          await Promise.allSettled([
            client.getProject(uuid),
            client.getProjectEnvironments(uuid),
            client.listResources({ project_uuid: uuid } as Record<
              string,
              string | number | undefined
            >),
            client.listDeployments({ limit: 10 } as Record<
              string,
              string | number | undefined
            >),
          ]);

        if (projectRes.status === 'rejected') {
          return reply.status(404).send({
            ok: false,
            error: { code: 'RESOURCE_NOT_FOUND', message: 'Project not found' },
          });
        }

        const project = projectRes.value.data as CoolifyProject;
        const environments =
          envsRes.status === 'fulfilled'
            ? normalizeEnvironments(
                (envsRes.value.data || []) as CoolifyEnvironment[],
              )
            : [];
        const resources =
          resourcesRes.status === 'fulfilled'
            ? normalizeResources(
                (resourcesRes.value.data || []) as CoolifyResource[],
              )
            : [];
        const deployments =
          deploymentsRes.status === 'fulfilled'
            ? normalizeDeployments(
                (deploymentsRes.value.data || []) as CoolifyDeployment[],
              )
            : [];

        return reply.send({
          ok: true,
          data: {
            uuid: project.uuid,
            name: project.name,
            description: project.description ?? undefined,
            environments,
            resources,
            deployments,
          },
        });
      } catch (error) {
        logger.error(
          { error: (error as Error).message },
          'Dashboard: get project error',
        );
        return reply.status(500).send({
          ok: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get project' },
        });
      }
    },
  );

  app.get<{ Params: { uuid: string } }>(
    '/api/projects/:uuid/resources',
    async (request, reply) => {
      try {
        const client = getCoolifyClient();
        const { uuid } = request.params;
        const res = await client.listResources({
          project_uuid: uuid,
        } as Record<string, string | number | undefined>);
        const resources = normalizeResources(
          (res.data || []) as CoolifyResource[],
        );
        return reply.send({ ok: true, data: resources });
      } catch (error) {
        logger.error(
          { error: (error as Error).message },
          'Dashboard: project resources error',
        );
        return reply.status(500).send({
          ok: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to list project resources',
          },
        });
      }
    },
  );

  app.get<{ Params: { uuid: string } }>(
    '/api/projects/:uuid/deployments',
    async (request, reply) => {
      try {
        const client = getCoolifyClient();
        const { uuid } = request.params;
        const res = await client.listDeployments({
          limit: 50,
        } as Record<string, string | number | undefined>);
        let deployments = normalizeDeployments(
          (res.data || []) as CoolifyDeployment[],
        );

        // Filter deployments by project: get the project's resources first
        const resourcesRes = await client.listResources({
          project_uuid: uuid,
        } as Record<string, string | number | undefined>);
        const resources =
          (resourcesRes.data || []) as CoolifyResource[];
        const resourceUuids = new Set(resources.map((r) => r.uuid));
        deployments = deployments.filter((d) =>
          resourceUuids.has(d.resource_uuid),
        );

        return reply.send({ ok: true, data: deployments });
      } catch (error) {
        logger.error(
          { error: (error as Error).message },
          'Dashboard: project deployments error',
        );
        return reply.status(500).send({
          ok: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to list project deployments',
          },
        });
      }
    },
  );
}
