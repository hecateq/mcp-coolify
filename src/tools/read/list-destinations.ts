import { z } from 'zod';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeDestinations } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyDestination } from '../../coolify/types.js';

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
    const response = await client.listDestinations();
    const destinations = normalizeDestinations((response.data || []) as CoolifyDestination[]);
    const durationMs = Date.now() - startTime;

    logger.info({ count: destinations.length, durationMs }, 'Listed destinations');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Found ${destinations.length} destination(s)`,
        data: destinations,
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
        : new CoolifyError('Failed to list destinations', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to list destinations',
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