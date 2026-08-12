import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeStorageMounts } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyStorageMount } from '../../coolify/types.js';

export const inputSchema = z.object({
  resource_uuid: coolifyResourceIdSchema.describe('Resource UUID'),
  resource_type: z
    .enum(['application', 'service', 'database'])
    .describe('Resource type: application, service, or database'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { resource_uuid: string; resource_type: string }) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.listStorages(input.resource_uuid, input.resource_type);
    const mounts = normalizeStorageMounts((response.data || []) as CoolifyStorageMount[]);
    const durationMs = Date.now() - startTime;

    logger.info({ count: mounts.length, resourceUuid: input.resource_uuid, durationMs }, 'Listed storage mounts');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Found ${mounts.length} storage mount(s)`,
        data: mounts,
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
        : new CoolifyError('Failed to list storage mounts', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to list storage mounts',
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
