import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import { logMutationAudit } from '../../observability/audit.js';
import { loadConfig } from '../../config/load-config.js';
import { checkOperationMode } from '../../security/policy.js';
import { checkResourceAllowed } from '../../security/scope.js';

export const inputSchema = z.object({
  database_uuid: coolifyResourceIdSchema.describe('Database UUID'),
  name: z.string().min(1).max(255).optional().describe('Database name'),
  description: z.string().max(1024).optional().describe('Database description'),
  cpu_limit: z.string().max(50).optional().describe('CPU limit (e.g., "1", "500m")'),
  memory_limit: z.string().max(50).optional().describe('Memory limit (e.g., "512Mi", "2Gi")'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: {
  database_uuid: string;
  name?: string;
  description?: string;
  cpu_limit?: string;
  memory_limit?: string;
}) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.description !== undefined) body.description = input.description;
    if (input.cpu_limit !== undefined) body.cpu_limit = input.cpu_limit;
    if (input.memory_limit !== undefined) body.memory_limit = input.memory_limit;

    if (Object.keys(body).length === 0) {
      const reason = 'No valid configuration fields provided';
      logMutationAudit('database_config_update', input.database_uuid, 'database', 'denied', reason);
      return policyDeniedResponse(reason, startTime);
    }

    const policyCheck = checkOperationMode(config, 'write');
    if (!policyCheck.allowed) {
      logMutationAudit('database_config_update', input.database_uuid, 'database', 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const scopeCheck = checkResourceAllowed(config, input.database_uuid);
    if (!scopeCheck.allowed) {
      logMutationAudit('database_config_update', input.database_uuid, 'database', 'denied', scopeCheck.reason);
      return policyDeniedResponse(scopeCheck.reason!, startTime);
    }

    await client.updateDatabaseConfig(input.database_uuid, body);
    const durationMs = Date.now() - startTime;

    logMutationAudit('database_config_update', input.database_uuid, 'database', 'allowed');

    logger.info(
      { databaseUuid: input.database_uuid, fields: Object.keys(body), durationMs },
      'Database configuration updated',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: 'Database configuration updated',
        data: { database_uuid: input.database_uuid, updated_fields: Object.keys(body) },
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
        : new CoolifyError('Failed to update database configuration', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('database_config_update', input.database_uuid, 'database', 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to update database configuration',
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

function policyDeniedResponse(reason: string, startTime: number) {
  const content = JSON.stringify(
    {
      ok: false,
      summary: 'Operation denied by policy',
      error: { code: 'POLICY_DENIED', message: reason, retryable: false },
      meta: { durationMs: Date.now() - startTime },
    },
    null,
    2,
  );
  return { content: [{ type: 'text' as const, text: content }], isError: true };
}
