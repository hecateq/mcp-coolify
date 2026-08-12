import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import { logMutationAudit } from '../../observability/audit.js';
import { loadConfig } from '../../config/load-config.js';
import { checkOperationMode } from '../../security/policy.js';
import { checkProjectAllowed } from '../../security/scope.js';
import { checkProductionMutation } from '../../security/production-guard.js';
import type { CreateServiceBody } from '../../coolify/types.js';

export const inputSchema = z.object({
  project_uuid: coolifyResourceIdSchema.describe('Project UUID'),
  environment_uuid: coolifyResourceIdSchema.describe('Environment UUID'),
  server_uuid: coolifyResourceIdSchema.describe('Server UUID to deploy the service on'),
  name: z.string().min(1).max(255).describe('Service name'),
  service_type: z.string().optional().describe('Service type (e.g., nginx, redis)'),
  docker_compose_raw: z.string().optional().describe('Raw docker-compose YAML content'),
  environment_name: z.string().optional().describe('Environment name for production guard check'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

export async function handler(input: {
  project_uuid: string;
  environment_uuid: string;
  server_uuid: string;
  name: string;
  service_type?: string;
  docker_compose_raw?: string;
  environment_name?: string;
}) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const policyCheck = checkOperationMode(config, 'write');
    if (!policyCheck.allowed) {
      logMutationAudit('create_service', 'n/a', 'service', 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const scopeCheck = checkProjectAllowed(config, input.project_uuid);
    if (!scopeCheck.allowed) {
      logMutationAudit('create_service', 'n/a', 'service', 'denied', scopeCheck.reason);
      return policyDeniedResponse(scopeCheck.reason!, startTime);
    }

    if (input.environment_name) {
      const prodCheck = checkProductionMutation(config, input.environment_name, 'deploy');
      if (!prodCheck.allowed) {
        logMutationAudit('create_service', 'n/a', 'service', 'denied', prodCheck.reason);
        return policyDeniedResponse(prodCheck.reason!, startTime);
      }
    }

    // Temporary: service provisioning is disabled. Create resources via Coolify Dashboard.
    const provisioningDisabled = {
      ok: false,
      error: {
        code: 'OPERATION_DISABLED',
        message: 'Service provisioning is temporarily disabled. Create the resource through the Coolify Dashboard, then use MCP to configure and deploy the application.',
        retryable: false,
      },
      meta: { durationMs: Date.now() - startTime },
    };
    void provisioningDisabled; // Intentional: gate available for future re-enablement
    // Uncomment the line below to enable this gate:
    // return { content: [{ type: 'text' as const, text: JSON.stringify(provisioningDisabled, null, 2) }], isError: true };

    const body: CreateServiceBody = {
      project_uuid: input.project_uuid,
      environment_uuid: input.environment_uuid,
      server_uuid: input.server_uuid,
      name: input.name,
      service_type: input.service_type,
      docker_compose_raw: input.docker_compose_raw,
    };

    const response = await client.createService(body);
    const durationMs = Date.now() - startTime;

    const data = response.data as Record<string, unknown>;
    const serviceUuid = data['uuid'] as string | undefined;

    logMutationAudit('create_service', serviceUuid ?? 'n/a', 'service', 'allowed');

    logger.info({ serviceUuid, name: input.name, projectUuid: input.project_uuid, durationMs }, 'Service created');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Service "${input.name}" created`,
        data: { uuid: serviceUuid, name: input.name },
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
        : new CoolifyError('Failed to create service', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('create_service', 'n/a', 'service', 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to create service',
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
