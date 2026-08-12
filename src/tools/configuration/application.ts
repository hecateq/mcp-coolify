import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import { logMutationAudit } from '../../observability/audit.js';
import { loadConfig } from '../../config/load-config.js';
import { checkOperationMode } from '../../security/policy.js';
import { checkResourceAllowed } from '../../security/scope.js';

const VALID_CONFIG_FIELDS = new Set([
  'name', 'description', 'fqdn', 'health_check', 'cpu_limit', 'memory_limit',
  'cpu_shares', 'replicas', 'ports', 'build_pack', 'base_directory',
  'dockerfile_location', 'auto_deploy', 'previews',
]);

export const inputSchema = z.object({
  application_uuid: coolifyResourceIdSchema.describe('Application UUID'),
  name: z.string().min(1).max(255).optional().describe('Application name'),
  description: z.string().max(1024).optional().describe('Application description'),
  fqdn: z.string().max(255).optional().describe('Fully qualified domain name'),
  health_check: z.boolean().optional().describe('Enable or disable health checks'),
  cpu_limit: z.string().max(50).optional().describe('CPU limit (e.g., "1", "500m")'),
  memory_limit: z.string().max(50).optional().describe('Memory limit (e.g., "512Mi", "2Gi")'),
  cpu_shares: z.number().int().min(2).max(1024).optional().describe('CPU shares (2-1024)'),
  replicas: z.number().int().min(1).max(10).optional().describe('Number of replicas'),
  ports: z.string().max(255).optional().describe('Port mapping'),
  build_pack: z.string().max(255).optional().describe('Build pack'),
  base_directory: z.string().max(1024).optional().describe('Base directory for build'),
  dockerfile_location: z.string().max(1024).optional().describe('Dockerfile location'),
  auto_deploy: z.boolean().optional().describe('Enable auto-deploy on push'),
  previews: z.boolean().optional().describe('Enable preview deployments'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: Record<string, unknown>) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();
  const appUuid = input.application_uuid as string;

  try {
    // Validate only known config fields
    const body: Record<string, unknown> = {};
    for (const key of Object.keys(input)) {
      if (key !== 'application_uuid' && VALID_CONFIG_FIELDS.has(key)) {
        body[key] = input[key];
      }
    }

    if (Object.keys(body).length === 0) {
      const reason = 'No valid configuration fields provided';
      logMutationAudit('application_config_update', appUuid, 'application', 'denied', reason);
      return policyDeniedResponse(reason, startTime);
    }

    const policyCheck = checkOperationMode(config, 'write');
    if (!policyCheck.allowed) {
      logMutationAudit('application_config_update', appUuid, 'application', 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const scopeCheck = checkResourceAllowed(config, appUuid);
    if (!scopeCheck.allowed) {
      logMutationAudit('application_config_update', appUuid, 'application', 'denied', scopeCheck.reason);
      return policyDeniedResponse(scopeCheck.reason!, startTime);
    }

    await client.updateApplicationConfig(appUuid, body);
    const durationMs = Date.now() - startTime;

    logMutationAudit('application_config_update', appUuid, 'application', 'allowed');

    logger.info(
      { applicationUuid: appUuid, fields: Object.keys(body), durationMs },
      'Application configuration updated',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: 'Application configuration updated',
        data: { application_uuid: appUuid, updated_fields: Object.keys(body) },
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
        : new CoolifyError('Failed to update application configuration', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('application_config_update', appUuid, 'application', 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to update application configuration',
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
