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
  resource_uuid: coolifyResourceIdSchema.describe('Resource UUID'),
  resource_type: z.enum(['application', 'service']).describe('Resource type'),
  task_uuid: coolifyResourceIdSchema.describe('Scheduled task UUID'),
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
  task_uuid: string;
}) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const policyCheck = checkOperationMode(config, 'write');
    if (!policyCheck.allowed) {
      logMutationAudit('scheduled_task_execute', input.resource_uuid, input.resource_type, 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const scopeCheck = checkResourceAllowed(config, input.resource_uuid);
    if (!scopeCheck.allowed) {
      logMutationAudit('scheduled_task_execute', input.resource_uuid, input.resource_type, 'denied', scopeCheck.reason);
      return policyDeniedResponse(scopeCheck.reason!, startTime);
    }

    const response = await client.executeScheduledTask(
      input.resource_uuid,
      input.task_uuid,
      input.resource_type,
    );
    const durationMs = Date.now() - startTime;
    const executionUuid = (response.data as Record<string, unknown>)?.['uuid'] as string | undefined;

    logMutationAudit('scheduled_task_execute', input.resource_uuid, input.resource_type, 'allowed');

    logger.info(
      { resourceUuid: input.resource_uuid, taskUuid: input.task_uuid, executionUuid, durationMs },
      'Scheduled task execution started',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: 'Scheduled task execution started',
        data: {
          execution_uuid: executionUuid,
          task_uuid: input.task_uuid,
          resource_uuid: input.resource_uuid,
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
        : new CoolifyError('Failed to execute scheduled task', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('scheduled_task_execute', input.resource_uuid, input.resource_type, 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to execute scheduled task',
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
