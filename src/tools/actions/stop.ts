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

export const inputSchema = z.object({
  resource_uuid: coolifyResourceIdSchema.describe('Resource UUID'),
  resource_type: z
    .enum(['application', 'service', 'database'])
    .describe('Resource type: application, service, or database'),
  environment_name: z.string().optional().describe('Environment name for production guard check'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
};

export async function handler(input: {
  resource_uuid: string;
  resource_type: string;
  environment_name?: string;
}) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    // Stop requires explicit COOLIFY_ALLOW_STOP=true
    if (!config.allowStop) {
      const reason = 'Stop operations are globally disabled — set COOLIFY_ALLOW_STOP=true to enable';
      logMutationAudit('stop', input.resource_uuid, input.resource_type, 'denied', reason);
      return policyDeniedResponse(reason, startTime);
    }

    const policyCheck = checkOperationMode(config, 'stop');
    if (!policyCheck.allowed) {
      logMutationAudit('stop', input.resource_uuid, input.resource_type, 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const scopeCheck = checkResourceAllowed(config, input.resource_uuid);
    if (!scopeCheck.allowed) {
      logMutationAudit('stop', input.resource_uuid, input.resource_type, 'denied', scopeCheck.reason);
      return policyDeniedResponse(scopeCheck.reason!, startTime);
    }

    // Production guard for stop (always strict)
    if (input.environment_name) {
      const prodCheck = checkProductionMutation(config, input.environment_name, 'stop');
      if (!prodCheck.allowed) {
        logMutationAudit('stop', input.resource_uuid, input.resource_type, 'denied', prodCheck.reason);
        return policyDeniedResponse(prodCheck.reason!, startTime);
      }
    }

    await client.stopApplication(input.resource_uuid);
    const durationMs = Date.now() - startTime;

    logMutationAudit('stop', input.resource_uuid, input.resource_type, 'allowed');
    logger.info({ resourceUuid: input.resource_uuid, durationMs }, 'Stop triggered');

    const content = JSON.stringify(
      {
        ok: true,
        summary: 'Stop triggered',
        data: { resource_uuid: input.resource_uuid, status: 'stopping' },
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
        : new CoolifyError('Stop failed', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('stop', input.resource_uuid, input.resource_type, 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Stop failed',
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
