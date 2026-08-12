import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeRollbackImagesResponse } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyRollbackImagesResponse } from '../../coolify/types.js';

export const inputSchema = z.object({
  application_uuid: coolifyResourceIdSchema.describe('Application UUID'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { application_uuid: string }) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.listApplicationRollbackImages(input.application_uuid);
    const normalized = normalizeRollbackImagesResponse(
      (response.data || {}) as CoolifyRollbackImagesResponse,
    );
    const durationMs = Date.now() - startTime;

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Found ${normalized.images.length} rollback image(s) for application ${input.application_uuid}`,
        data: normalized,
        meta: { durationMs },
      },
      null,
      2,
    );

    logger.info(
      { applicationUuid: input.application_uuid, count: normalized.images.length, durationMs },
      'Listed rollback images',
    );
    return { content: [{ type: 'text' as const, text: content }] };
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const coolifyError =
      error instanceof CoolifyError
        ? error
        : new CoolifyError('Failed to list rollback images', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to list rollback images',
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