import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeResources } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyResource } from '../../coolify/types.js';

export const inputSchema = z.object({
  server_uuid: coolifyResourceIdSchema.describe('Server UUID'),
  resource_type: z
    .enum(['application', 'service', 'database'])
    .optional()
    .describe('Filter by resource type'),
  status: z
    .enum(['running', 'stopped', 'degraded', 'restarting', 'exited'])
    .optional()
    .describe('Filter by resource status'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { server_uuid: string; resource_type?: string; status?: string }) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.listServerResources(input.server_uuid, input.resource_type, input.status);
    let resources = normalizeResources((response.data || []) as CoolifyResource[]);

    if (input.resource_type) {
      resources = resources.filter((r) => r.type === input.resource_type);
    }
    if (input.status) {
      resources = resources.filter((r) => r.status === input.status);
    }

    const durationMs = Date.now() - startTime;

    logger.info({ count: resources.length, serverUuid: input.server_uuid, durationMs }, 'Listed server resources');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Found ${resources.length} resource(s) on server`,
        data: resources,
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
        : new CoolifyError('Failed to list server resources', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to list server resources',
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
