import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeBackupExecutions } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyBackupExecution } from '../../coolify/types.js';

export const inputSchema = z.object({
  database_uuid: coolifyResourceIdSchema.describe('Database UUID'),
  scheduled_backup_uuid: coolifyResourceIdSchema.describe('Scheduled backup UUID'),
  limit: z.number().int().min(1).max(100).default(20).describe('Max executions to return'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: {
  database_uuid: string;
  scheduled_backup_uuid: string;
  limit?: number;
}) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.listDatabaseBackupExecutions(
      input.database_uuid,
      input.scheduled_backup_uuid,
      input.limit,
    );
    let executions = normalizeBackupExecutions((response.data || []) as CoolifyBackupExecution[]);

    const limit = input.limit ?? 20;
    const truncated = executions.length > limit;
    executions = executions.slice(0, limit);

    const durationMs = Date.now() - startTime;

    logger.info(
      {
        count: executions.length,
        databaseUuid: input.database_uuid,
        scheduledBackupUuid: input.scheduled_backup_uuid,
        durationMs,
      },
      'Listed backup executions',
    );

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
        : new CoolifyError('Failed to list backup executions', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to list backup executions',
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
