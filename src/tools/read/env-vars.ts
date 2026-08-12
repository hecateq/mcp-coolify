import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeEnvVars } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyEnvVar } from '../../coolify/types.js';

export const inputSchema = z.object({
  application_uuid: coolifyResourceIdSchema.optional()
    .describe('Application UUID (use for application env vars)'),
  resource_type: z
    .enum(['application', 'service', 'database'])
    .optional()
    .describe('Resource type (allows reading env vars from services and databases too)'),
  resource_uuid: coolifyResourceIdSchema.optional()
    .describe('Resource UUID (used with resource_type for non-application resources)'),
}).refine(
  (data) => {
    if (data.resource_type && !data.resource_uuid) {
      return false;
    }
    return true;
  },
  { message: 'resource_uuid is required when resource_type is specified' },
);

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: {
  application_uuid?: string;
  resource_type?: string;
  resource_uuid?: string;
}) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    let response: { data: unknown[] };
    let resourceLabel: string;

    if (input.resource_type && input.resource_uuid) {
      // Use resource_type + resource_uuid for non-application resources
      switch (input.resource_type) {
        case 'service':
          response = await client.getServiceEnvs(input.resource_uuid);
          resourceLabel = `service ${input.resource_uuid}`;
          break;
        case 'database':
          response = await client.getDatabaseEnvs(input.resource_uuid);
          resourceLabel = `database ${input.resource_uuid}`;
          break;
        case 'application':
        default:
          response = await client.getApplicationEnvs(input.resource_uuid);
          resourceLabel = `application ${input.resource_uuid}`;
          break;
      }
    } else {
      // Backward-compatible: use application_uuid
      const uuid = input.application_uuid;
      if (!uuid) {
        throw new CoolifyError('Either application_uuid or resource_type+resource_uuid must be provided', 'VALIDATION_ERROR', 400, false);
      }
      response = await client.getApplicationEnvs(uuid);
      resourceLabel = `application ${uuid}`;
    }

    const envVars = normalizeEnvVars((response.data || []) as CoolifyEnvVar[]);
    const durationMs = Date.now() - startTime;

    logger.info(
      { resourceLabel, count: envVars.length, durationMs },
      'Listed environment variables (values redacted)',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Found ${envVars.length} environment variable(s) — values are never returned`,
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
