import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeProject, normalizeEnvironments, normalizeResources, normalizeDeployments } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyProject, CoolifyEnvironment, CoolifyResource, CoolifyDeployment, ProjectOverview } from '../../coolify/types.js';

export const inputSchema = z.object({
  project_uuid: coolifyResourceIdSchema.describe('Project UUID'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { project_uuid: string }) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const [projectRes, envRes, resourcesRes, deploymentsRes] = await Promise.all([
      client.getProject(input.project_uuid),
      client.getProjectEnvironments(input.project_uuid),
      client.listResources(),
      client.listDeployments(),
    ]);

    const project = normalizeProject(projectRes.data as CoolifyProject);
    const environments = normalizeEnvironments(envRes.data as CoolifyEnvironment[]);
    const allResources = normalizeResources((resourcesRes.data || []) as CoolifyResource[]);
    const allDeployments = normalizeDeployments((deploymentsRes.data || []) as CoolifyDeployment[]);

    const projectResources = allResources.filter((r) => r.project_uuid === input.project_uuid);

    const envsWithCounts = environments.map((env) => ({
      ...env,
      resourceCount: projectResources.filter((r) => r.environment_uuid === env.uuid).length,
    }));

    const recentDeployments = allDeployments
      .filter((d) => projectResources.some((r) => r.uuid === d.resource_uuid))
      .slice(0, 5);

    const running = projectResources.filter((r) => r.status === 'running').length;
    const stopped = projectResources.filter((r) => r.status === 'stopped').length;
    const degraded = projectResources.filter(
      (r) => r.status === 'degraded' || r.status === 'exited',
    ).length;
    const failedDeployments = recentDeployments.filter(
      (d) => d.status === 'failed',
    ).length;

    const overview: ProjectOverview = {
      project,
      environments: envsWithCounts,
      resources: projectResources,
      recentDeployments,
      summary: {
        totalResources: projectResources.length,
        running,
        stopped,
        degraded,
        failedDeployments,
      },
    };

    const durationMs = Date.now() - startTime;
    logger.info({ projectUuid: input.project_uuid, durationMs }, 'Project overview generated');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Overview for project "${project.name}": ${overview.summary.totalResources} resources, ${running} running`,
        data: overview,
        meta: { durationMs },
      },
      null,
      2,
    );

    return { content: [{ type: 'text' as const, text: content }] };
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const coolifyError =
      error instanceof CoolifyError
        ? error
        : new CoolifyError('Failed to get project overview', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to get project overview',
              error: {
                code: coolifyError.code,
                message: coolifyError.message,
                retryable: coolifyError.retryable,
              },
              meta: { durationMs },
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
}
