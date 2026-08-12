import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { normalizeS3ValidateResult } from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import { logMutationAudit } from '../../observability/audit.js';
import { loadConfig } from '../../config/load-config.js';
import { checkOperationMode } from '../../security/policy.js';
import type { CoolifyS3ValidateResult } from '../../coolify/types.js';

export const inputSchema = z.object({
  s3_storage_uuid: coolifyResourceIdSchema.describe('S3 Storage UUID'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { s3_storage_uuid: string }) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const policyCheck = checkOperationMode(config, 'write');
    if (!policyCheck.allowed) {
      logMutationAudit('s3_storage_validate', input.s3_storage_uuid, 's3-storage', 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const response = await client.validateS3Storage(input.s3_storage_uuid);
    const normalized = normalizeS3ValidateResult((response.data || {}) as CoolifyS3ValidateResult);
    const durationMs = Date.now() - startTime;

    logMutationAudit('s3_storage_validate', input.s3_storage_uuid, 's3-storage', 'allowed');

    logger.info(
      { s3StorageUuid: input.s3_storage_uuid, valid: normalized.valid, durationMs },
      'S3 storage validation executed',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: normalized.valid ? 'S3 storage connection is valid' : 'S3 storage validation completed (invalid)',
        data: normalized,
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
        : new CoolifyError('Failed to validate S3 storage', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('s3_storage_validate', input.s3_storage_uuid, 's3-storage', 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to validate S3 storage',
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