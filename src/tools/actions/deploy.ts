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
  force: z.boolean().default(false).describe('Force deploy (POST instead of GET)'),
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
  force?: boolean;
  environment_name?: string;
}) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    // 1. Operation mode check
    const policyCheck = checkOperationMode(config, 'deploy');
    if (!policyCheck.allowed) {
      logMutationAudit('deploy', input.resource_uuid, input.resource_type, 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    // 2. Resource allowlist check
    const scopeCheck = checkResourceAllowed(config, input.resource_uuid);
    if (!scopeCheck.allowed) {
      logMutationAudit('deploy', input.resource_uuid, input.resource_type, 'denied', scopeCheck.reason);
      return policyDeniedResponse(scopeCheck.reason!, startTime);
    }

    // 3. Production guard
    const prodCheck = checkProductionMutation(config, input.environment_name, 'deploy');
    if (!prodCheck.allowed) {
      logMutationAudit('deploy', input.resource_uuid, input.resource_type, 'denied', prodCheck.reason);
      return policyDeniedResponse(prodCheck.reason!, startTime);
    }

    // 4. Execute deploy
    const deployFn = input.force
      ? client.deployResourceForce
      : (uuid: string, type: string) => client.deployResource(uuid, type);

    const response = await deployFn(input.resource_uuid, input.resource_type);
    const durationMs = Date.now() - startTime;

    const data = response.data as Record<string, unknown>;
    const deploymentUuid = data?.['deployment_uuid'] as string | undefined;

    logMutationAudit('deploy', input.resource_uuid, input.resource_type, 'allowed');

    logger.info(
      { resourceUuid: input.resource_uuid, deploymentUuid, durationMs, force: !!input.force },
      'Deploy triggered',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Deploy triggered — deployment UUID: ${deploymentUuid || 'unknown'}`,
        data: { deployment_uuid: deploymentUuid, resource_uuid: input.resource_uuid, status: 'queued' },
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
        : new CoolifyError('Deploy failed', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('deploy', input.resource_uuid, input.resource_type, 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Deploy failed',
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
