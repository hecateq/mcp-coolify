import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import { logMutationAudit } from '../../observability/audit.js';

export const inputSchema = z.object({
  server_uuid: coolifyResourceIdSchema.describe('Server UUID'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { server_uuid: string }) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.validateServer(input.server_uuid);
    const durationMs = Date.now() - startTime;

    logMutationAudit('server_validate', input.server_uuid, 'server', 'allowed');

    logger.info({ serverUuid: input.server_uuid, durationMs }, 'Server validation executed');

    const content = JSON.stringify(
      {
        ok: true,
        summary: 'Server validation executed',
        data: response.data,
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
        : new CoolifyError('Failed to validate server', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('server_validate', input.server_uuid, 'server', 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to validate server',
              error: { code: coolifyError.code, message: coolifyError.message, retryable: coolifyError.retryable },
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
