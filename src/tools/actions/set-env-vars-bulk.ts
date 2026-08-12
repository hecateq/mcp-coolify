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
import type { EnvVarEntry } from '../../coolify/types.js';

export const inputSchema = z.object({
  resource_uuid: coolifyResourceIdSchema.describe('Resource UUID'),
  resource_type: z
    .enum(['application', 'service', 'database'])
    .describe('Resource type: application, service, or database'),
  variables: z
    .array(
      z.object({
        key: z.string().min(1).max(256),
        value: z.string().min(1).max(65536),
      }),
    )
    .min(1)
    .max(50)
    .describe('Environment variables to set (1-50 entries)'),
  environment_name: z.string().optional().describe('Environment name for production guard check'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: {
  resource_uuid: string;
  resource_type: string;
  variables: EnvVarEntry[];
  environment_name?: string;
}) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    // Env write requires COOLIFY_ALLOW_ENV_WRITE=true
    if (!config.allowEnvWrite) {
      const reason = 'Environment variable writes are disabled — set COOLIFY_ALLOW_ENV_WRITE=true to enable';
      logMutationAudit('set_env_vars_bulk', input.resource_uuid, input.resource_type, 'denied', reason);
      return policyDeniedResponse(reason, startTime);
    }

    const policyCheck = checkOperationMode(config, 'env_write');
    if (!policyCheck.allowed) {
      logMutationAudit('set_env_vars_bulk', input.resource_uuid, input.resource_type, 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const scopeCheck = checkResourceAllowed(config, input.resource_uuid);
    if (!scopeCheck.allowed) {
      logMutationAudit('set_env_vars_bulk', input.resource_uuid, input.resource_type, 'denied', scopeCheck.reason);
      return policyDeniedResponse(scopeCheck.reason!, startTime);
    }

    if (input.environment_name) {
      const prodCheck = checkProductionMutation(config, input.environment_name, 'env_write');
      if (!prodCheck.allowed) {
        logMutationAudit('set_env_vars_bulk', input.resource_uuid, input.resource_type, 'denied', prodCheck.reason);
        return policyDeniedResponse(prodCheck.reason!, startTime);
      }
    }

    await client.setEnvsBulk(input.resource_uuid, input.resource_type, input.variables);

    const durationMs = Date.now() - startTime;
    const keys = input.variables.map((v) => v.key);
    const count = input.variables.length;

    logMutationAudit('set_env_vars_bulk', input.resource_uuid, input.resource_type, 'allowed');
    logger.info(
      { resourceUuid: input.resource_uuid, resourceType: input.resource_type, keys, count, durationMs },
      'Bulk environment variables updated (values not logged)',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Updated ${count} environment variable(s)`,
        data: {
          updated: true,
          keys,
          count,
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
        : new CoolifyError('Failed to set environment variables', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('set_env_vars_bulk', input.resource_uuid, input.resource_type, 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to set environment variables',
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
