import { z } from 'zod';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeTeam } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyTeam } from '../../coolify/types.js';

export const inputSchema = z.object({});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler() {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.getCurrentTeam();
    const team = normalizeTeam(response.data as CoolifyTeam);
    const durationMs = Date.now() - startTime;

    logger.info({ teamId: team.id, teamName: team.name, durationMs }, 'Got current team');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Current team: ${team.name}`,
        data: team,
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
        : new CoolifyError('Failed to get current team', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to get current team',
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
