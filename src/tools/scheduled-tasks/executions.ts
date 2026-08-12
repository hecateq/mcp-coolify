import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeTaskExecutions } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyTaskExecution } from '../../coolify/types.js';

export const inputSchema = z.object({
  task_uuid: z.string().describe('Scheduled task UUID'),
  resource_uuid: coolifyResourceIdSchema.describe('Resource UUID'),
  resource_type: z
    .enum(['application', 'service'])
    .optional()
    .describe('Resource type. Defaults to application if omitted.'),
  status: z
    .enum(['running', 'completed', 'failed', 'cancelled'])
    .optional()
    .describe('Filter by execution status'),
  limit: z.number().int().min(1).max(100).default(20).describe('Max executions to return'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: {
  task_uuid: string;
  resource_uuid: string;
  resource_type?: string;
  status?: string;
  limit?: number;
}) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.getTaskExecutions(
      input.resource_uuid,
      input.task_uuid,
      input.resource_type,
      input.status,
      input.limit,
    );
    let executions = normalizeTaskExecutions((response.data || []) as CoolifyTaskExecution[]);

    if (input.status) {
      executions = executions.filter((e) => e.status === input.status);
    }

    const limit = input.limit ?? 20;
    const truncated = executions.length > limit;
    executions = executions.slice(0, limit);

    const durationMs = Date.now() - startTime;

    logger.info({ count: executions.length, taskUuid: input.task_uuid, durationMs }, 'Listed task executions');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Found ${executions.length} execution(s)${truncated ? ' (truncated)' : ''}`,
        data: executions,
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
        : new CoolifyError('Failed to list task executions', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to list task executions',
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
