import { z } from 'zod';
import { getCoolifyClient } from '../../coolify/client.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import { logMutationAudit } from '../../observability/audit.js';
import { loadConfig } from '../../config/load-config.js';
import { checkOperationMode } from '../../security/policy.js';
import type { CreateS3StorageBody } from '../../coolify/types.js';

export const inputSchema = z.object({
  name: z.string().min(1).max(255).describe('A friendly name for the S3 storage'),
  endpoint: z.string().min(1).max(1024).describe('S3 endpoint URL (e.g. https://s3.amazonaws.com)'),
  bucket: z.string().min(1).max(255).describe('S3 bucket name'),
  region: z.string().min(1).max(128).describe('S3 region (e.g. us-east-1)'),
  key: z.string().min(1).max(1024).describe('S3 access key'),
  secret: z.string().min(1).max(2048).describe('S3 secret key'),
  description: z.string().optional().describe('Optional description'),
  is_usable: z.boolean().optional().describe('Whether the storage is marked usable'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

export async function handler(input: {
  name: string;
  endpoint: string;
  bucket: string;
  region: string;
  key: string;
  secret: string;
  description?: string;
  is_usable?: boolean;
}) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const policyCheck = checkOperationMode(config, 'write');
    if (!policyCheck.allowed) {
      logMutationAudit('s3_storage_create', 'n/a', 's3-storage', 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const body: CreateS3StorageBody = {
      name: input.name,
      endpoint: input.endpoint,
      bucket: input.bucket,
      region: input.region,
      key: input.key,
      secret: input.secret,
    };
    if (input.description !== undefined) body.description = input.description;
    if (input.is_usable !== undefined) body.is_usable = input.is_usable;

    const response = await client.createS3Storage(body);
    const durationMs = Date.now() - startTime;
    const data = response.data as Record<string, unknown>;
    const storageUuid = data?.['uuid'] as string | undefined;

    logMutationAudit('s3_storage_create', storageUuid ?? 'n/a', 's3-storage', 'allowed');

    // NEVER log key/secret values
    logger.info(
      { name: input.name, endpoint: input.endpoint, bucket: input.bucket, region: input.region, storageUuid, durationMs },
      'S3 storage created',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: 'S3 storage created',
        data: { uuid: storageUuid, name: input.name, bucket: input.bucket, region: input.region },
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
        : new CoolifyError('Failed to create S3 storage', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('s3_storage_create', 'n/a', 's3-storage', 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to create S3 storage',
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