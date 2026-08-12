import { z } from 'zod';
import { getCoolifyClient } from '../../coolify/client.js';
import { logger } from '../../observability/logger.js';

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
    const healthResult = await client.health();
    const durationMs = Date.now() - startTime;
    const authOk = healthResult.ok;

    const content = JSON.stringify(
      {
        ok: authOk,
        coolifyUrl: client['baseUrl'] ? '[CONFIGURED]' : '[NOT SET]',
        authStatus: authOk ? 'authenticated' : 'failed',
        latencyMs: healthResult.latencyMs,
        transport: process.env['MCP_TRANSPORT'] || 'stdio',
      },
      null,
      2,
    );

    logger.info({ durationMs, authOk }, 'Health check completed');
    return { content: [{ type: 'text' as const, text: content }] };
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';

    const content = JSON.stringify(
      {
        ok: false,
        coolifyUrl: '[CONFIGURED]',
        authStatus: 'error',
        error: message,
        latencyMs: durationMs,
      },
      null,
      2,
    );

    return { content: [{ type: 'text' as const, text: content }], isError: true };
  }
}
