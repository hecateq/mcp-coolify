import { z } from 'zod';
import { getCoolifyClient } from '../../coolify/client.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import { logMutationAudit } from '../../observability/audit.js';
import { loadConfig } from '../../config/load-config.js';
import { checkOperationMode } from '../../security/policy.js';

export const inputSchema = z.object({
  name: z.string().min(1).max(255).describe('Project name'),
  description: z.string().optional().describe('Project description'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

export async function handler(input: { name: string; description?: string }) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const policyCheck = checkOperationMode(config, 'write');
    if (!policyCheck.allowed) {
      logMutationAudit('create_project', 'n/a', 'project', 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const response = await client.createProject({ name: input.name, description: input.description });
    const durationMs = Date.now() - startTime;

    const data = response.data as Record<string, unknown>;
    const projectUuid = data['uuid'] as string | undefined;
    const projectName = data['name'] as string | undefined;

    logMutationAudit('create_project', projectUuid ?? 'n/a', 'project', 'allowed');

    logger.info({ projectUuid, name: input.name, durationMs }, 'Project created');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Project "${projectName || input.name}" created`,
        data: { uuid: projectUuid, name: projectName || input.name },
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
        : new CoolifyError('Failed to create project', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('create_project', 'n/a', 'project', 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to create project',
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
