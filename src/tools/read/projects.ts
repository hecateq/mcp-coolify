import { z } from 'zod';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeProjects } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyProject } from '../../coolify/types.js';

export const inputSchema = z.object({
  name: z.string().optional().describe('Filter projects by name (case-insensitive partial match)'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { name?: string }) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.listProjects();
    let projects = normalizeProjects(response.data as CoolifyProject[]);

    if (input.name) {
      const filter = input.name.toLowerCase();
      projects = projects.filter((p) => p.name.toLowerCase().includes(filter));
    }

    const durationMs = Date.now() - startTime;

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Found ${projects.length} project(s)`,
        data: projects,
        meta: { durationMs, truncated: false },
      },
      null,
      2,
    );

    logger.info({ count: projects.length, durationMs }, 'Listed projects');
    return { content: [{ type: 'text' as const, text: content }] };
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const coolifyError = error instanceof CoolifyError
      ? error
      : new CoolifyError('Failed to list projects', 'UPSTREAM_ERROR', 500, false);

    const content = JSON.stringify(
      {
        ok: false,
        summary: 'Failed to list projects',
        error: {
          code: coolifyError.code,
          message: coolifyError.message,
          retryable: coolifyError.retryable,
        },
        meta: { durationMs },
      },
      null,
      2,
    );

    return { content: [{ type: 'text' as const, text: content }], isError: true };
  }
}
