import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeDeployments } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyDeployment } from '../../coolify/types.js';

export const inputSchema = z.object({
  resource_uuid: coolifyResourceIdSchema.optional().describe('Filter by resource UUID'),
  status: z
    .enum(['queued', 'in_progress', 'finished', 'failed', 'cancelled-by-user'])
    .optional()
    .describe('Filter by deployment status'),
  limit: z.number().int().min(1).max(50).default(10).describe('Max deployments to return'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: {
  resource_uuid?: string;
  status?: string;
  limit?: number;
}) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.listDeployments();
    let deployments = normalizeDeployments((response.data || []) as CoolifyDeployment[]);

    if (input.resource_uuid) {
      deployments = deployments.filter((d) => d.resource_uuid === input.resource_uuid);
    }
    if (input.status) {
      deployments = deployments.filter((d) => d.status === input.status);
    }

    const limit = input.limit ?? 10;
    const truncated = deployments.length > limit;
    deployments = deployments.slice(0, limit);

    const durationMs = Date.now() - startTime;
    logger.info({ count: deployments.length, durationMs }, 'Listed deployments');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Found ${deployments.length} deployment(s)${truncated ? ' (truncated)' : ''}`,
        data: deployments,
        meta: { durationMs, truncated },
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
        : new CoolifyError('Failed to list deployments', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to list deployments',
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
