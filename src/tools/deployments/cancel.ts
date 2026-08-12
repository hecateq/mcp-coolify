import { z } from 'zod';
import { getCoolifyClient } from '../../coolify/client.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import { logMutationAudit } from '../../observability/audit.js';
export const inputSchema = z.object({
  deployment_uuid: z.string().describe('Deployment UUID to cancel'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

export async function handler(input: { deployment_uuid: string }) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    
    const deployment = await client.getDeployment(input.deployment_uuid);
    const deployData = deployment.data as Record<string, unknown>;
    const status = deployData?.['status'] as string | undefined;

    if (status === 'finished' || status === 'failed' || status === 'cancelled-by-user') {
      const reason = `Cannot cancel deployment in terminal state: ${status}`;
      logMutationAudit('deployment_cancel', input.deployment_uuid, 'deployment', 'denied', reason);
      const content = JSON.stringify(
        {
          ok: false,
          summary: 'Operation not supported',
          error: {
            code: 'UNSUPPORTED_OPERATION',
            message: reason,
            retryable: false,
          },
          meta: { durationMs: Date.now() - startTime },
        },
        null,
        2,
      );
      return { content: [{ type: 'text' as const, text: content }], isError: true };
    }

    await client.cancelDeployment(input.deployment_uuid);
    const durationMs = Date.now() - startTime;

    logMutationAudit('deployment_cancel', input.deployment_uuid, 'deployment', 'allowed');

    logger.info({ deploymentUuid: input.deployment_uuid, durationMs }, 'Deployment cancelled');

    const content = JSON.stringify(
      {
        ok: true,
        summary: 'Deployment cancelled',
        data: { deployment_uuid: input.deployment_uuid, status: 'cancelling' },
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
        : new CoolifyError('Failed to cancel deployment', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('deployment_cancel', input.deployment_uuid, 'deployment', 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to cancel deployment',
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
