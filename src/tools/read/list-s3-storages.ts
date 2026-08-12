import { z } from 'zod';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeS3Storages } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyS3Storage } from '../../coolify/types.js';

export const inputSchema = z.object({
  name: z.string().optional().describe('Filter S3 storages by name (case-insensitive partial match)'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { name?: string }) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.listS3Storages();
    let storages = normalizeS3Storages((response.data || []) as CoolifyS3Storage[]);

    if (input.name) {
      const filter = input.name.toLowerCase();
      storages = storages.filter((s) => s.name.toLowerCase().includes(filter));
    }

    const durationMs = Date.now() - startTime;

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Found ${storages.length} S3 storage(s)`,
        data: storages,
        meta: { durationMs, truncated: false },
      },
      null,
      2,
    );

    logger.info({ count: storages.length, durationMs }, 'Listed S3 storages');
    return { content: [{ type: 'text' as const, text: content }] };
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const coolifyError =
      error instanceof CoolifyError
        ? error
        : new CoolifyError('Failed to list S3 storages', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to list S3 storages',
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