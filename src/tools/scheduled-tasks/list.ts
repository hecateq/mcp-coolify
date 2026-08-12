import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeScheduledTasks } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyScheduledTask } from '../../coolify/types.js';

export const inputSchema = z.object({
  resource_uuid: coolifyResourceIdSchema.describe('Resource UUID'),
  resource_type: z
    .enum(['application', 'service'])
    .optional()
    .describe('Resource type. Defaults to application if omitted.'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { resource_uuid: string; resource_type?: string }) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.listScheduledTasks(input.resource_uuid, input.resource_type);
    const tasks = normalizeScheduledTasks((response.data || []) as CoolifyScheduledTask[]);
    const durationMs = Date.now() - startTime;

    logger.info({ count: tasks.length, resourceUuid: input.resource_uuid, durationMs }, 'Listed scheduled tasks');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Found ${tasks.length} scheduled task(s)`,
        data: tasks,
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
        : new CoolifyError('Failed to list scheduled tasks', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to list scheduled tasks',
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
