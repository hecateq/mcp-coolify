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
  key: z.string().min(1).max(256).describe('Environment variable key name'),
  value: z.string().min(1).max(65536).describe('Environment variable value (will be redacted in response)'),
  environment_name: z.string().optional().describe('Environment name for production guard check'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: {
  resource_uuid: string;
  key: string;
  value: string;
  environment_name?: string;
}) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    // Env write requires COOLIFY_ALLOW_ENV_WRITE=true
    if (!config.allowEnvWrite) {
      const reason = 'Environment variable writes are disabled — set COOLIFY_ALLOW_ENV_WRITE=true to enable';
      logMutationAudit('set_env_var', input.resource_uuid, 'env_variable', 'denied', reason);
      return policyDeniedResponse(reason, startTime);
    }

    const policyCheck = checkOperationMode(config, 'env_write');
    if (!policyCheck.allowed) {
      logMutationAudit('set_env_var', input.resource_uuid, 'env_variable', 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const scopeCheck = checkResourceAllowed(config, input.resource_uuid);
    if (!scopeCheck.allowed) {
      logMutationAudit('set_env_var', input.resource_uuid, 'env_variable', 'denied', scopeCheck.reason);
      return policyDeniedResponse(scopeCheck.reason!, startTime);
    }

    if (input.environment_name) {
      const prodCheck = checkProductionMutation(config, input.environment_name, 'env_write');
      if (!prodCheck.allowed) {
        logMutationAudit('set_env_var', input.resource_uuid, 'env_variable', 'denied', prodCheck.reason);
        return policyDeniedResponse(prodCheck.reason!, startTime);
      }
    }

    await client.setApplicationEnvsBulk(input.resource_uuid, {
      envs: [{ key: input.key, value: input.value }],
    });

    const durationMs = Date.now() - startTime;
    logMutationAudit('set_env_var', input.resource_uuid, 'env_variable', 'allowed');
    logger.info(
      { resourceUuid: input.resource_uuid, key: input.key, durationMs },
      'Environment variable set (value not logged)',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Environment variable "${input.key}" updated`,
        data: {
          updated: true,
          key: input.key,
          resource_uuid: input.resource_uuid,
          value: '[REDACTED]',
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
        : new CoolifyError('Failed to set environment variable', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('set_env_var', input.resource_uuid, 'env_variable', 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to set environment variable',
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
