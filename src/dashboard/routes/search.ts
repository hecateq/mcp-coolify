import type { FastifyInstance } from 'fastify';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeProjects } from '../../coolify/normalizers.js';
import type { CoolifyProject, CoolifyResource } from '../../coolify/types.js';
import { logger } from '../../observability/logger.js';
import { getToolRegistry } from '../tools-registry.js';

interface SearchResult {
  uuid: string;
  name: string;
  matchField: string;
}

function fuzzyMatch(
  items: { uuid: string; name: string; matchField?: string }[],
  query: string,
): SearchResult[] {
  const q = query.toLowerCase();
  return items
    .filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.matchField && item.matchField.toLowerCase().includes(q)),
    )
    .map((item) => ({
      uuid: item.uuid,
      name: item.name,
      matchField: item.matchField ?? item.name,
    }));
}

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { q?: string } }>(
    '/api/search',
    async (request, reply) => {
      try {
        const query = request.query.q?.trim();
        if (!query || query.length < 2) {
          return reply.send({
            ok: true,
            data: {
              projects: [],
              applications: [],
              services: [],
              databases: [],
              servers: [],
              deployments: [],
              tasks: [],
              tools: [],
            },
          });
        }

        const client = getCoolifyClient();

        const [projectsRes, resourcesRes, serversRes] =
          await Promise.allSettled([
            client.listProjects(),
            client.listResources(),
            client.listServers(),
          ]);

        const allProjects =
          projectsRes.status === 'fulfilled'
            ? normalizeProjects(
                (projectsRes.value.data || []) as CoolifyProject[],
              )
            : [];
        const allResources =
          resourcesRes.status === 'fulfilled'
            ? ((resourcesRes.value.data || []) as CoolifyResource[])
            : [];
        const allServers =
          serversRes.status === 'fulfilled'
            ? ((serversRes.value.data || []) as {
                uuid: string;
                name: string;
              }[])
            : [];

        const apps = allResources.filter(
          (r: CoolifyResource) => r.type === 'application',
        );
        const services = allResources.filter(
          (r: CoolifyResource) => r.type === 'service',
        );
        const dbs = allResources.filter((r: CoolifyResource) =>
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

        const toolRegistry = getToolRegistry();
        const toolItems = toolRegistry.map(
          (t: { name: string; description: string }) => ({
            uuid: t.name,
            name: t.name,
            matchField: t.description,
          }),
        );

        return reply.send({
          ok: true,
          data: {
            projects: fuzzyMatch(allProjects, query),
            applications: fuzzyMatch(apps, query),
            services: fuzzyMatch(services, query),
            databases: fuzzyMatch(dbs, query),
            servers: fuzzyMatch(
              allServers.map((s) => ({
                uuid: s.uuid,
                name: s.name,
              })),
              query,
            ),
            deployments: [],
            tasks: [],
            tools: fuzzyMatch(toolItems, query),
          },
        });
      } catch (error) {
        logger.error(
          { error: (error as Error).message },
          'Dashboard: search error',
        );
        return reply.status(500).send({
          ok: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to search' },
        });
      }
    },
  );
}
