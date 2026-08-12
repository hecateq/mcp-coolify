import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeBackupExecutions } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyBackupExecution } from '../../coolify/types.js';

export const inputSchema = z.object({
  database_uuid: coolifyResourceIdSchema.describe('Database UUID'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { database_uuid: string }) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.listDatabaseBackups(input.database_uuid);
    const backups = normalizeBackupExecutions((response.data || []) as CoolifyBackupExecution[]);
    const durationMs = Date.now() - startTime;

    logger.info({ count: backups.length, databaseUuid: input.database_uuid, durationMs }, 'Listed database backups');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Found ${backups.length} backup(s)`,
        data: backups,
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
        : new CoolifyError('Failed to list database backups', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to list database backups',
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
