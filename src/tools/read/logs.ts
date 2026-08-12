import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { CoolifyError } from '../../coolify/errors.js';
import { redactSecrets } from '../../security/redaction.js';
import { loadConfig } from '../../config/load-config.js';
import { logger } from '../../observability/logger.js';

export const inputSchema = z.object({
  application_uuid: coolifyResourceIdSchema.describe('Application UUID'),
  lines: z
    .number()
    .int()
    .min(10)
    .max(1000)
    .optional()
    .describe('Number of log lines to fetch (default: from COOLIFY_LOG_MAX_LINES, max enforced)'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { application_uuid: string; lines?: number }) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const maxLines = config.logMaxLines;
    const requestedLines = input.lines ?? maxLines;
    const lines = Math.min(requestedLines, maxLines);

    const response = await client.getApplicationLogs(input.application_uuid, lines);

    let logText: string;
    if (typeof response.data === 'string') {
      logText = response.data;
    } else {
      logText = JSON.stringify(response.data);
    }

    const redactedLogs = redactSecrets(logText);
    const durationMs = Date.now() - startTime;

    const truncated = requestedLines > maxLines;
    const summary = truncated
      ? `Fetched logs (capped at ${maxLines} lines per policy, requested ${requestedLines})`
      : 'Fetched logs';

    logger.info(
      { applicationUuid: input.application_uuid, lines, durationMs },
      'Fetched application logs',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary,
        data: { logs: redactedLogs, lineCount: lines },
        meta: { durationMs, truncated },
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
        : new CoolifyError('Failed to get logs', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to get application logs',
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
