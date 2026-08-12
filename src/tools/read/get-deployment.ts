import { z } from 'zod';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeDeployment } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyDeployment } from '../../coolify/types.js';

export const inputSchema = z.object({
  deployment_uuid: z.string().describe('Deployment UUID'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { deployment_uuid: string }) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.getDeployment(input.deployment_uuid);
    const deployment = normalizeDeployment(response.data as CoolifyDeployment);
    const durationMs = Date.now() - startTime;

    logger.info({ deploymentUuid: input.deployment_uuid, status: deployment.status, durationMs }, 'Got deployment detail');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Deployment: ${deployment.status}`,
        data: deployment,
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
        : new CoolifyError('Failed to get deployment', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to get deployment',
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
