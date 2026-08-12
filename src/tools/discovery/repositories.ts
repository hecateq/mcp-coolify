import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeGitHubRepositories } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyGitHubRepository } from '../../coolify/types.js';

export const inputSchema = z.object({
  github_app_uuid: coolifyResourceIdSchema.describe('GitHub App UUID'),
  search: z.string().optional().describe('Optional search query to filter repositories'),
  page: z.number().int().min(1).optional().describe('Page number for pagination'),
  limit: z.number().int().min(1).max(100).default(30).describe('Results per page (max 100)'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { github_app_uuid: string; search?: string; page?: number; limit?: number }) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.listGithubRepositories(
      input.github_app_uuid,
      input.search,
      input.page,
      input.limit,
    );
    let repos = normalizeGitHubRepositories((response.data || []) as CoolifyGitHubRepository[]);

    const limit = input.limit ?? 30;
    const truncated = repos.length > limit;
    repos = repos.slice(0, limit);

    const durationMs = Date.now() - startTime;

    logger.info({ count: repos.length, durationMs }, 'Listed GitHub repositories');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Found ${repos.length} repositor${repos.length === 1 ? 'y' : 'ies'}${truncated ? ' (truncated)' : ''}`,
        data: repos,
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
        : new CoolifyError('Failed to list repositories', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to list repositories',
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
