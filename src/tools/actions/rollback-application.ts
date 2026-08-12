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
  application_uuid: coolifyResourceIdSchema.describe('Application UUID'),
  image: z
    .string()
    .min(1)
    .max(255)
    .describe('Image tag/commit to roll back to — sent as the "commit" field to the Coolify API'),
  environment_name: z.string().optional().describe('Environment name for production guard check'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
};

export async function handler(input: {
  application_uuid: string;
  image: string;
  environment_name?: string;
}) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    // 1. Operation mode check — rollback is a deploy operation
    const policyCheck = checkOperationMode(config, 'deploy');
    if (!policyCheck.allowed) {
      logMutationAudit('rollback_application', input.application_uuid, 'application', 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    // 2. Resource allowlist check
    const scopeCheck = checkResourceAllowed(config, input.application_uuid);
    if (!scopeCheck.allowed) {
      logMutationAudit('rollback_application', input.application_uuid, 'application', 'denied', scopeCheck.reason);
      return policyDeniedResponse(scopeCheck.reason!, startTime);
    }

    // 3. Production guard
    const prodCheck = checkProductionMutation(config, input.environment_name, 'deploy');
    if (!prodCheck.allowed) {
      logMutationAudit('rollback_application', input.application_uuid, 'application', 'denied', prodCheck.reason);
      return policyDeniedResponse(prodCheck.reason!, startTime);
    }

    // 4. Execute rollback — Coolify API accepts the image tag/commit as the "commit" field
    const response = await client.rollbackApplication(input.application_uuid, input.image);
    const durationMs = Date.now() - startTime;

    const data = response.data as Record<string, unknown>;
    const deploymentUuid = data?.['deployment_uuid'] as string | undefined;

    logMutationAudit('rollback_application', input.application_uuid, 'application', 'allowed');

    logger.info(
      { applicationUuid: input.application_uuid, deploymentUuid, durationMs },
      'Rollback deployment queued',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Rollback deployment queued — deployment UUID: ${deploymentUuid || 'unknown'}`,
        data: { deployment_uuid: deploymentUuid, application_uuid: input.application_uuid, image: input.image, status: 'queued' },
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
        : new CoolifyError('Rollback failed', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('rollback_application', input.application_uuid, 'application', 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Rollback failed',
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