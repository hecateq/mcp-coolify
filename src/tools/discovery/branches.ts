import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeGitHubBranches } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyGitHubBranch } from '../../coolify/types.js';

export const inputSchema = z.object({
  github_app_uuid: coolifyResourceIdSchema.describe('GitHub App UUID'),
  owner: z.string().min(1).max(256).describe('Repository owner (GitHub username or organization)'),
  repository: z.string().min(1).max(256).describe('Repository name'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { github_app_uuid: string; owner: string; repository: string }) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const response = await client.listGithubBranches(input.github_app_uuid, input.owner, input.repository);
    const branches = normalizeGitHubBranches((response.data || []) as CoolifyGitHubBranch[]);
    const durationMs = Date.now() - startTime;

    logger.info({ count: branches.length, owner: input.owner, repo: input.repository, durationMs }, 'Listed GitHub branches');

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Found ${branches.length} branch(es) for ${input.owner}/${input.repository}`,
        data: branches,
        meta: { durationMs, truncated: false },
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
        : new CoolifyError('Failed to list branches', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to list branches',
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
