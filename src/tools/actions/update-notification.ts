import { z } from 'zod';
import { getCoolifyClient } from '../../coolify/client.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import { logMutationAudit } from '../../observability/audit.js';
import { loadConfig } from '../../config/load-config.js';
import { checkOperationMode } from '../../security/policy.js';
import type { UpdateNotificationBody } from '../../coolify/types.js';

/**
 * Channel-specific updatable fields (PATCH semantics — all optional,
 * but at least one field must be provided). Field names match the Coolify API
 * fillable settings for each channel.
 */
const channelSchema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal('email'),
    smtp_enabled: z.boolean().optional(),
    smtp_from_address: z.string().max(255).optional(),
    smtp_from_name: z.string().max(255).optional(),
    smtp_recipients: z.string().max(1000).optional(),
    smtp_host: z.string().max(255).optional(),
    smtp_port: z.number().int().min(1).max(65535).optional(),
    smtp_encryption: z.enum(['starttls', 'tls', 'none']).optional(),
    smtp_username: z.string().max(255).optional(),
    smtp_password: z.string().max(255).optional(),
    resend_enabled: z.boolean().optional(),
    resend_api_key: z.string().max(255).optional(),
    use_instance_email_settings: z.boolean().optional(),
  }),
  z.object({
    channel: z.literal('discord'),
    discord_enabled: z.boolean().optional(),
    discord_webhook_url: z.string().url().optional(),
    discord_ping_enabled: z.boolean().optional(),
  }),
  z.object({
    channel: z.literal('slack'),
    slack_enabled: z.boolean().optional(),
    slack_webhook_url: z.string().url().optional(),
  }),
  z.object({
    channel: z.literal('telegram'),
    telegram_enabled: z.boolean().optional(),
    telegram_token: z.string().max(255).optional(),
    telegram_chat_id: z.string().max(255).optional(),
  }),
  z.object({
    channel: z.literal('pushover'),
    pushover_enabled: z.boolean().optional(),
    pushover_user_key: z.string().max(255).optional(),
    pushover_api_token: z.string().max(255).optional(),
  }),
  z.object({
    channel: z.literal('webhook'),
    webhook_enabled: z.boolean().optional(),
    webhook_url: z.string().url().optional(),
  }),
]);

export const inputSchema = channelSchema.superRefine((data, ctx) => {
  const fieldCount = Object.keys(data).filter((key) => key !== 'channel').length;
  if (fieldCount === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one notification field must be provided',
    });
  }
});

type UpdateNotificationInput = z.infer<typeof inputSchema>;

export const annotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

/**
 * Build the PATCH body from the validated input, dropping the channel
 * discriminator and any unset fields. Secret values flow only into the
 * request body — never into logs or responses.
 */
function buildUpdateBody(input: UpdateNotificationInput): UpdateNotificationBody {
  const body: UpdateNotificationBody = {};
  const entries = Object.entries(input) as [string, string | number | boolean | undefined][];
  for (const [key, value] of entries) {
    if (key === 'channel') {
      continue;
    }
    if (value !== undefined && value !== null) {
      body[key] = value;
    }
  }
  return body;
}

export async function handler(input: UpdateNotificationInput) {
  const config = loadConfig();
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const policyCheck = checkOperationMode(config, 'write');
    if (!policyCheck.allowed) {
      logMutationAudit('notification_update', input.channel, 'notification', 'denied', policyCheck.reason);
      return policyDeniedResponse(policyCheck.reason!, startTime);
    }

    const body = buildUpdateBody(input);
    const updatedKeys = Object.keys(body);

    const response = await client.updateNotification(input.channel, body);
    const durationMs = Date.now() - startTime;

    logMutationAudit('notification_update', input.channel, 'notification', 'allowed');

    // Only field NAMES are logged — never their values (webhook URLs, tokens, passwords).
    logger.info(
      { channel: input.channel, updatedKeys, durationMs },
      'Notification settings updated (values redacted)',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: `Updated ${input.channel} notification settings (${updatedKeys.length} field(s))`,
        data: {
          channel: input.channel,
          updated_fields: updatedKeys,
          response_status: response.status,
        },
        meta: {
          durationMs,
          note: 'Credential values (webhook URLs, tokens, passwords) are never echoed back.',
        },
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
        : new CoolifyError('Failed to update notification settings', 'UPSTREAM_ERROR', 500, false);

    logMutationAudit('notification_update', input.channel, 'notification', 'error', coolifyError.message);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to update notification settings',
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