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
  scheduled_backup_uuid: coolifyResourceIdSchema.describe('Scheduled backup UUID'),
  schedule: z.string().min(1).max(255).optional().describe('Cron expression for backup schedule'),
  retention: z.number().int().min(1).max(365).optional().describe('Number of backups to retain'),
  enabled: z.boolean().optional().describe('Enable or disable the backup config'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: {
  database_uuid: string;
  scheduled_backup_uuid: string;
  schedule?: string;
  retention?: number;
  enabled?: boolean;
}) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    // Validate cron expression if provided
    if (input.schedule && !CRON_REGEX.test(input.schedule)) {
      const reason = `Invalid cron expression: "${input.schedule}"`;
      logMutationAudit('database_backup_config_update', input.database_uuid, 'database', 'denied', reason);
      return policyDeniedResponse(reason, startTime);
    }

    const policyCheck = checkOperationMode(config, 'write');
    if (!policyCheck.allowed) {
      logMutationAudit('database_backup_config_update', input.database_uuid, 'database', 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const scopeCheck = checkResourceAllowed(config, input.database_uuid);
    if (!scopeCheck.allowed) {
      logMutationAudit('database_backup_config_update', input.database_uuid, 'database', 'denied', scopeCheck.reason);
      return policyDeniedResponse(scopeCheck.reason!, startTime);
    }

    const body: Record<string, unknown> = {};
    if (input.schedule !== undefined) body.schedule = input.schedule;
    if (input.retention !== undefined) body.retention = input.retention;
    if (input.enabled !== undefined) body.enabled = input.enabled;

    if (Object.keys(body).length === 0) {
      const reason = 'At least one of schedule, retention, or enabled must be provided';
      logMutationAudit('database_backup_config_update', input.database_uuid, 'database', 'denied', reason);
      return policyDeniedResponse(reason, startTime);
    }

    await client.updateBackupConfig(input.database_uuid, input.scheduled_backup_uuid, body);
    const durationMs = Date.now() - startTime;

    logMutationAudit('database_backup_config_update', input.database_uuid, 'database', 'allowed');

    logger.info(
      { databaseUuid: input.database_uuid, scheduledBackupUuid: input.scheduled_backup_uuid, durationMs },
      'Backup configuration updated',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: 'Backup configuration updated',
        data: {
          backup_config_uuid: input.scheduled_backup_uuid,
          database_uuid: input.database_uuid,
          updated_fields: Object.keys(body),
        },
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
        : new CoolifyError('Failed to update backup configuration', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('database_backup_config_update', input.database_uuid, 'database', 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to update backup configuration',
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
  return {
    content: [{ type: 'text' as const, text: content }],
    isError: true,
  };
}
