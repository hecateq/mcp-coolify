import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import { logMutationAudit } from '../../observability/audit.js';
import { loadConfig } from '../../config/load-config.js';
import { checkOperationMode } from '../../security/policy.js';
import { checkResourceAllowed } from '../../security/scope.js';

const CRON_REGEX = /^(@(every|annually|yearly|monthly|weekly|daily|hourly))|(@every\s+\d+(ns|us|ms|s|m|h|d))|((\*|[0-9\-,/]+)\s+(\*|[0-9\-,/]+)\s+(\*|[0-9\-,/]+)\s+(\*|[0-9\-,/]+)\s+(\*|[0-9\-,/]+))$/;

export const inputSchema = z.object({
  database_uuid: coolifyResourceIdSchema.describe('Database UUID'),
  schedule: z.string().min(1).max(255).describe('Cron expression for backup schedule'),
  destination_uuid: coolifyResourceIdSchema.optional().describe('Storage destination UUID'),
  retention: z.number().int().min(1).max(365).optional().describe('Number of backups to retain'),
  enabled: z.boolean().default(true).describe('Whether the backup config is enabled'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

export async function handler(input: {
  database_uuid: string;
  schedule: string;
  destination_uuid?: string;
  retention?: number;
  enabled?: boolean;
}) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    // Validate cron expression
    if (!CRON_REGEX.test(input.schedule)) {
      const reason = `Invalid cron expression: "${input.schedule}"`;
      logMutationAudit('database_backup_config_create', input.database_uuid, 'database', 'denied', reason);
      return policyDeniedResponse(reason, startTime);
    }

    const policyCheck = checkOperationMode(config, 'write');
    if (!policyCheck.allowed) {
      logMutationAudit('database_backup_config_create', input.database_uuid, 'database', 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const scopeCheck = checkResourceAllowed(config, input.database_uuid);
    if (!scopeCheck.allowed) {
      logMutationAudit('database_backup_config_create', input.database_uuid, 'database', 'denied', scopeCheck.reason);
      return policyDeniedResponse(scopeCheck.reason!, startTime);
    }

    const body = {
      schedule: input.schedule,
      destination_uuid: input.destination_uuid,
      retention: input.retention,
      enabled: input.enabled ?? true,
    };

    const response = await client.createBackupConfig(input.database_uuid, body);
    const durationMs = Date.now() - startTime;
    const configUuid = (response.data as Record<string, unknown>)?.['uuid'] as string | undefined;

    logMutationAudit('database_backup_config_create', input.database_uuid, 'database', 'allowed');

    logger.info(
      { databaseUuid: input.database_uuid, configUuid, durationMs },
      'Backup configuration created',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: 'Backup configuration created',
        data: { backup_config_uuid: configUuid, database_uuid: input.database_uuid },
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
        : new CoolifyError('Failed to create backup configuration', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('database_backup_config_create', input.database_uuid, 'database', 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to create backup configuration',
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
