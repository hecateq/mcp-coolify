import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeDomains } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyDomain } from '../../coolify/types.js';

export const inputSchema = z.object({
  server_uuid: coolifyResourceIdSchema.describe('Server UUID'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { server_uuid: string }) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.listServerDomains(input.server_uuid);
    const domains = normalizeDomains((response.data || []) as CoolifyDomain[]);
    const durationMs = Date.now() - startTime;

    logger.info({ count: domains.length, serverUuid: input.server_uuid, durationMs }, 'Listed server domains');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Found ${domains.length} domain(s)`,
        data: domains,
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
        : new CoolifyError('Failed to list server domains', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to list server domains',
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
