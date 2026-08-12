import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeResourceDetail } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';

export const inputSchema = z.object({
  uuid: coolifyResourceIdSchema.describe('Resource UUID'),
  type: z
    .enum(['application', 'service', 'database'])
    .describe('Resource type: application, service, or database'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { uuid: string; type: string }) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    let raw: Record<string, unknown>;

    switch (input.type) {
      case 'application':
        raw = (await client.getApplication(input.uuid)).data as Record<string, unknown>;
        break;
      case 'service':
        raw = (await client.get(`/services/${input.uuid}`)).data as Record<string, unknown>;
        break;
      case 'database':
        raw = (await client.get(`/databases/${input.uuid}`)).data as Record<string, unknown>;
        break;
      default:
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ok: false,
                  summary: 'Invalid resource type',
                  error: {
                    code: 'VALIDATION_ERROR',
                    message: `Invalid resource type: ${input.type}`,
                    retryable: false,
                  },
                  meta: { durationMs: Date.now() - startTime },
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
    }

    const detail = normalizeResourceDetail(raw);
    const durationMs = Date.now() - startTime;

    logger.info({ resourceUuid: input.uuid, type: input.type, durationMs }, 'Got resource detail');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Resource: ${detail.name}`,
        data: detail,
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
        : new CoolifyError('Failed to get resource', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to get resource',
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
