import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';
import { getCoolifyClient } from '../../coolify/client.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import { logMutationAudit } from '../../observability/audit.js';
import { loadConfig } from '../../config/load-config.js';
import { checkOperationMode } from '../../security/policy.js';
import type { CreateDestinationBody, DestinationType } from '../../coolify/types.js';

const NETWORK_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export const inputSchema = z.object({
  server_uuid: coolifyResourceIdSchema.describe('Server UUID the destination will be attached to'),
  network: z
    .string()
    .min(1)
    .max(255)
    .regex(NETWORK_PATTERN, 'Network name must start with an alphanumeric char and contain only [a-zA-Z0-9._-]')
    .describe('Docker network name (required by the Coolify API)'),
  name: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe('Destination name (defaults to <server-name>-<network> if omitted)'),
  destination_type: z
    .enum(['standalone', 'swarm'])
    .optional()
    .describe('Destination type — must match the server type (standalone or swarm)'),
});

export const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

export async function handler(input: {
  server_uuid: string;
  network: string;
  name?: string;
  destination_type?: DestinationType;
}) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const policyCheck = checkOperationMode(config, 'write');
    if (!policyCheck.allowed) {
      logMutationAudit('destination_create', input.server_uuid, 'destination', 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const body: CreateDestinationBody = {
      network: input.network,
    };
    if (input.name !== undefined) {
      body.name = input.name;
    }
    if (input.destination_type !== undefined) {
      body.type = input.destination_type;
    }

    const response = await client.createDestination(input.server_uuid, body);
    const durationMs = Date.now() - startTime;

    const data = response.data as Record<string, unknown>;
    const destinationUuid = typeof data?.['uuid'] === 'string' ? data['uuid'] : undefined;

    logMutationAudit('destination_create', destinationUuid ?? input.server_uuid, 'destination', 'allowed');

    logger.info(
      { serverUuid: input.server_uuid, network: input.network, destinationUuid, durationMs },
      'Destination created',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Destination created${destinationUuid ? ` — UUID: ${destinationUuid}` : ''}`,
        data: {
          uuid: destinationUuid,
          server_uuid: input.server_uuid,
          network: input.network,
          name: input.name,
          destination_type: input.destination_type,
        },
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
        : new CoolifyError('Failed to create destination', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('destination_create', input.server_uuid, 'destination', 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to create destination',
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
      summary: 'Operation not permitted',
      error: { code: 'POLICY_DENIED' as const, message: reason, retryable: false },
      meta: { durationMs: Date.now() - startTime },
    },
    null,
    2,
  );
  return { content: [{ type: 'text' as const, text: content }], isError: true };
}