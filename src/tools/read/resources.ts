import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeResources } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyResource } from '../../coolify/types.js';

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
    let resources = await fetchAllResources(client);

    if (input.project_uuid) {
      resources = resources.filter((r) => r.project_uuid === input.project_uuid);
    }
    if (input.environment_uuid) {
      resources = resources.filter((r) => r.environment_uuid === input.environment_uuid);
    }
    if (input.resource_type) {
      resources = resources.filter((r) => r.type === input.resource_type);
    }
    if (input.status) {
      resources = resources.filter((r) => r.status === input.status);
    }
    if (input.search) {
      const search = input.search.toLowerCase();
      resources = resources.filter((r) => r.name.toLowerCase().includes(search));
    }

    const normalized = normalizeResources(resources);
    const durationMs = Date.now() - startTime;

    logger.info({ count: normalized.length, durationMs }, 'Listed resources');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Found ${normalized.length} resource(s)`,
        data: normalized,
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

async function fetchAllResources(
  client: ReturnType<typeof getCoolifyClient>,
): Promise<CoolifyResource[]> {
  const response = await client.listResources();
  const data = response.data;
  if (Array.isArray(data)) {
    return data as CoolifyResource[];
  }
  return [];
}
