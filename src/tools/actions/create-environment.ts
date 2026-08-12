import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import { logMutationAudit } from '../../observability/audit.js';
import { loadConfig } from '../../config/load-config.js';
import { checkOperationMode } from '../../security/policy.js';
import { checkProjectAllowed } from '../../security/scope.js';

export const inputSchema = z.object({
  project_uuid: coolifyResourceIdSchema.describe('Project UUID'),
  name: z.string().min(1).max(255).describe('Environment name (e.g., staging, production)'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

export async function handler(input: { project_uuid: string; name: string }) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const policyCheck = checkOperationMode(config, 'write');
    if (!policyCheck.allowed) {
      logMutationAudit('create_environment', 'n/a', 'environment', 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const scopeCheck = checkProjectAllowed(config, input.project_uuid);
    if (!scopeCheck.allowed) {
      logMutationAudit('create_environment', 'n/a', 'environment', 'denied', scopeCheck.reason);
      return policyDeniedResponse(scopeCheck.reason!, startTime);
    }

    const response = await client.createEnvironment(input.project_uuid, { name: input.name });
    const durationMs = Date.now() - startTime;

    const data = response.data as Record<string, unknown>;
    const envUuid = data['uuid'] as string | undefined;

    logMutationAudit('create_environment', envUuid ?? 'n/a', 'environment', 'allowed');

    logger.info({ envUuid, name: input.name, projectUuid: input.project_uuid, durationMs }, 'Environment created');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Environment "${input.name}" created`,
        data: { uuid: envUuid, name: input.name, project_uuid: input.project_uuid },
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
        : new CoolifyError('Failed to create environment', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('create_environment', 'n/a', 'environment', 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to create environment',
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
