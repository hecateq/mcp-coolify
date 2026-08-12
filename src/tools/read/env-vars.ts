import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeEnvVars } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyEnvVar } from '../../coolify/types.js';

export const inputSchema = z.object({
  resource_uuid: coolifyResourceIdSchema.describe('Resource UUID'),
  resource_type: z
    .enum(['application', 'service', 'database'])
    .describe('Resource type: application, service, or database'),
  environment_name: z.string().optional().describe('Environment name (informational)'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: {
  resource_uuid: string;
  resource_type: 'application' | 'service' | 'database';
  environment_name?: string;
}) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    // Resource type -> path resolution lives in the client (shared with the
    // set_env_vars tools via the same envsPath mapping).
    const response = await client.getEnvs(input.resource_uuid, input.resource_type);
    const envVars = normalizeEnvVars((response.data || []) as CoolifyEnvVar[]);
    const durationMs = Date.now() - startTime;

    logger.info(
      {
        resourceUuid: input.resource_uuid,
        resourceType: input.resource_type,
        count: envVars.length,
        durationMs,
      },
      'Listed environment variables (values redacted)',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: `${envVars.length} environment variable(s) for ${input.resource_type} ${input.resource_uuid}`,
        data: envVars,
        meta: { durationMs, note: 'Values are redacted for security. Only keys and metadata shown.' },
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
        : new CoolifyError('Failed to list environment variables', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to list environment variables',
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
