import { z } from 'zod';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeVersion } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';

export const inputSchema = z.object({});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler() {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.getVersion();
    const version = normalizeVersion(response.data);
    const durationMs = Date.now() - startTime;

    logger.info({ version: version.version, durationMs }, 'Fetched Coolify version');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Coolify version ${version.version}`,
        data: version,
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
        : new CoolifyError('Failed to fetch Coolify version', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to fetch Coolify version',
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