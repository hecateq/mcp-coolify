import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import { logMutationAudit } from '../../observability/audit.js';
import { loadConfig } from '../../config/load-config.js';
import { checkOperationMode } from '../../security/policy.js';
import { checkResourceAllowed } from '../../security/scope.js';
import { checkProductionMutation } from '../../security/production-guard.js';

const CRON_REGEX = /^(@(every|annually|yearly|monthly|weekly|daily|hourly))|(@every\s+\d+(ns|us|ms|s|m|h|d))|((\*|[0-9\-,/]+)\s+(\*|[0-9\-,/]+)\s+(\*|[0-9\-,/]+)\s+(\*|[0-9\-,/]+)\s+(\*|[0-9\-,/]+))$/;

export const inputSchema = z.object({
  resource_uuid: coolifyResourceIdSchema.describe('Resource UUID'),
  resource_type: z.enum(['application', 'service']).describe('Resource type'),
  name: z.string().min(1).max(255).describe('Task name'),
  command: z.string().min(1).max(65536).describe('Command to execute'),
  schedule: z.string().min(1).max(255).describe('Cron expression (e.g., "*/5 * * * *" or "@daily")'),
  container: z.string().optional().describe('Optional container name'),
  timeout: z.number().int().min(1).max(86400).optional().describe('Timeout in seconds (max 86400)'),
  enabled: z.boolean().default(true).describe('Whether the task is enabled'),
  environment_name: z.string().optional().describe('Environment name for production guard check'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

export async function handler(input: {
  resource_uuid: string;
  resource_type: string;
  name: string;
  command: string;
  schedule: string;
  container?: string;
  timeout?: number;
  enabled?: boolean;
  environment_name?: string;
}) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    // Validate cron expression
    if (!CRON_REGEX.test(input.schedule)) {
      const reason = `Invalid cron expression: "${input.schedule}"`;
      logMutationAudit('scheduled_task_create', input.resource_uuid, input.resource_type, 'denied', reason);
      return policyDeniedResponse(reason, startTime);
    }

    const policyCheck = checkOperationMode(config, 'write');
    if (!policyCheck.allowed) {
      logMutationAudit('scheduled_task_create', input.resource_uuid, input.resource_type, 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const scopeCheck = checkResourceAllowed(config, input.resource_uuid);
    if (!scopeCheck.allowed) {
      logMutationAudit('scheduled_task_create', input.resource_uuid, input.resource_type, 'denied', scopeCheck.reason);
      return policyDeniedResponse(scopeCheck.reason!, startTime);
    }

    if (input.environment_name) {
      const prodCheck = checkProductionMutation(config, input.environment_name, 'deploy');
      if (!prodCheck.allowed) {
        logMutationAudit('scheduled_task_create', input.resource_uuid, input.resource_type, 'denied', prodCheck.reason);
        return policyDeniedResponse(prodCheck.reason!, startTime);
      }
    }

    const body = {
      name: input.name,
      command: input.command,
      schedule: input.schedule,
      container: input.container,
      timeout: input.timeout,
      enabled: input.enabled ?? true,
    };

    const response = await client.createScheduledTask(input.resource_uuid, body, input.resource_type);
    const durationMs = Date.now() - startTime;
    const taskUuid = (response.data as Record<string, unknown>)?.['uuid'] as string | undefined;

    logMutationAudit('scheduled_task_create', input.resource_uuid, input.resource_type, 'allowed');

    logger.info(
      { resourceUuid: input.resource_uuid, taskUuid, name: input.name, durationMs },
      'Scheduled task created',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Scheduled task "${input.name}" created`,
        data: { task_uuid: taskUuid, name: input.name, resource_uuid: input.resource_uuid },
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
        : new CoolifyError('Failed to create scheduled task', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('scheduled_task_create', input.resource_uuid, input.resource_type, 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to create scheduled task',
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
