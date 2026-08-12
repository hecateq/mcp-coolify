import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeProject, normalizeEnvironments } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import { loadConfig } from '../../config/load-config.js';
import { checkProjectAllowed } from '../../security/scope.js';
import type { CoolifyProject, CoolifyEnvironment } from '../../coolify/types.js';

export const inputSchema = z.object({
  uuid: coolifyResourceIdSchema.describe('Project UUID'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { uuid: string }) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const scopeCheck = checkProjectAllowed(config, input.uuid);
    if (!scopeCheck.allowed) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                ok: false,
                summary: 'Access denied',
                error: {
                  code: 'POLICY_DENIED',
                  message: scopeCheck.reason,
                  retryable: false,
                },
                meta: { durationMs: Date.now() - startTime },
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }

    const [projectResponse, envResponse] = await Promise.all([
      client.getProject(input.uuid),
      client.getProjectEnvironments(input.uuid),
    ]);

    const project = normalizeProject(projectResponse.data as CoolifyProject);
    const environments = normalizeEnvironments(envResponse.data as CoolifyEnvironment[]);

    const durationMs = Date.now() - startTime;
    logger.info({ projectUuid: input.uuid, durationMs }, 'Got project detail');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Project: ${project.name}`,
        data: {
          project,
          environments,
          environmentCount: environments.length,
        },
        meta: { durationMs },
      },
      null,
      2,
    );

    return { content: [{ type: 'text' as const, text: content }] };
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const coolifyError = error instanceof CoolifyError
      ? error
      : new CoolifyError('Failed to get project', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to get project',
              error: {
                code: coolifyError.code,
                message: coolifyError.message,
                retryable: coolifyError.retryable,
              },
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
