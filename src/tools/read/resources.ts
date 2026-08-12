import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { fetchFilteredResources } from '../../coolify/resource-queries.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';

export const inputSchema = z.object({
  project_uuid: coolifyResourceIdSchema.optional().describe('Filter by project UUID'),
  environment_uuid: coolifyResourceIdSchema.optional().describe('Filter by environment UUID'),
  resource_type: z
    .enum(['application', 'service', 'database', 'postgresql', 'mysql', 'redis', 'mongodb'])
    .optional()
    .describe('Filter by resource type'),
  status: z
    .enum(['running', 'stopped', 'degraded', 'restarting', 'exited'])
    .optional()
    .describe('Filter by status'),
  search: z.string().optional().describe('Search by resource name (case-insensitive)'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: {
  project_uuid?: string;
  environment_uuid?: string;
  resource_type?: string;
  status?: string;
  search?: string;
}) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const normalized = await fetchFilteredResources(client, {
      project_uuid: input.project_uuid,
      environment_uuid: input.environment_uuid,
      resource_type: input.resource_type,
      status: input.status,
      search: input.search,
    });
    const durationMs = Date.now() - startTime;

    // List tools return a compact summary per resource: uuid, name, type, status.
    // Heavy fields (domain/ports/compose bodies) belong to the get_* tools.
    const summary = normalized.map((r) => ({
      uuid: r.uuid,
      name: r.name,
      type: r.type,
      status: r.status,
    }));

    logger.info({ count: summary.length, durationMs }, 'Listed resources');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Found ${summary.length} resource(s)`,
        data: summary,
        meta: { durationMs, truncated: false },
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
        : new CoolifyError('Failed to list resources', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to list resources',
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

