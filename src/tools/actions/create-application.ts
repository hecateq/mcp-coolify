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
import type { CreateApplicationBody } from '../../coolify/types.js';

export const inputSchema = z.object({
  project_uuid: coolifyResourceIdSchema.describe('Project UUID'),
  environment_uuid: coolifyResourceIdSchema.describe('Environment UUID'),
  name: z.string().min(1).max(255).describe('Application name'),
  source_type: z
    .enum(['public', 'private-github-app', 'private-deploy-key', 'dockerfile', 'dockerimage'])
    .optional()
    .describe('Source type for the application'),
  repository_url: z.string().optional().describe('Git repository URL'),
  branch: z.string().optional().describe('Git branch name'),
  build_pack: z.string().optional().describe('Build pack'),
  port: z.number().int().positive().optional().describe('Application port'),
  domains: z.string().optional().describe('Comma-separated domain names'),
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
  name: string;
  source_type?: string;
  repository_url?: string;
  branch?: string;
  build_pack?: string;
  port?: number;
  domains?: string;
  environment_name?: string;
}) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const policyCheck = checkOperationMode(config, 'write');
    if (!policyCheck.allowed) {
      logMutationAudit('create_application', 'n/a', 'application', 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const scopeCheck = checkProjectAllowed(config, input.project_uuid);
    if (!scopeCheck.allowed) {
      logMutationAudit('create_application', 'n/a', 'application', 'denied', scopeCheck.reason);
      return policyDeniedResponse(scopeCheck.reason!, startTime);
    }

    if (input.environment_name) {
      const prodCheck = checkProductionMutation(config, input.environment_name, 'deploy');
      if (!prodCheck.allowed) {
        logMutationAudit('create_application', 'n/a', 'application', 'denied', prodCheck.reason);
        return policyDeniedResponse(prodCheck.reason!, startTime);
      }
    }

    const body: CreateApplicationBody = {
      project_uuid: input.project_uuid,
      environment_uuid: input.environment_uuid,
      name: input.name,
      source_type: input.source_type as CreateApplicationBody['source_type'],
      repository_url: input.repository_url,
      branch: input.branch,
      build_pack: input.build_pack,
      port: input.port,
      domains: input.domains,
    };

    const response = await client.createApplication(body);
    const durationMs = Date.now() - startTime;

    const data = response.data as Record<string, unknown>;
    const appUuid = data['uuid'] as string | undefined;

    logMutationAudit('create_application', appUuid ?? 'n/a', 'application', 'allowed');

    logger.info({ appUuid, name: input.name, projectUuid: input.project_uuid, durationMs }, 'Application created');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Application "${input.name}" created`,
        data: {
          uuid: appUuid,
          name: input.name,
          type: 'application',
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
        : new CoolifyError('Failed to create application', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('create_application', 'n/a', 'application', 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to create application',
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
