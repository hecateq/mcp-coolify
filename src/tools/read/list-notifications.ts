import { z } from 'zod';
import { getCoolifyClient } from '../../coolify/client.js';
import {
  normalizeNotificationSettingsList,
  NOTIFICATION_CHANNELS,
} from '../../coolify/normalizers.js';
import { CoolifyError } from '../../coolify/errors.js';
import { logger } from '../../observability/logger.js';
import type { CoolifyNotificationSettings, NotificationChannel } from '../../coolify/types.js';

export const inputSchema = z.object({
  channel: z
    .enum(['email', 'discord', 'slack', 'telegram', 'pushover', 'webhook'])
    .optional()
    .describe('Filter by notification channel. Omit to list all channels.'),
});

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export async function handler(input: { channel?: NotificationChannel }) {
  const client = getCoolifyClient();
  const startTime = Date.now();

  try {
    const channels: readonly NotificationChannel[] = input.channel
      ? [input.channel]
      : NOTIFICATION_CHANNELS;

    const settingsByChannel: Partial<Record<NotificationChannel, CoolifyNotificationSettings | undefined>> = {};
    for (const channel of channels) {
      const response = await client.getNotification(channel);
      if (response.data && typeof response.data === 'object') {
        settingsByChannel[channel] = response.data as CoolifyNotificationSettings;
      }
    }

    const notifications = normalizeNotificationSettingsList(settingsByChannel);
    const durationMs = Date.now() - startTime;

    logger.info(
      { channel: input.channel ?? 'all', count: notifications.length, durationMs },
      'Listed notification settings (secrets redacted)',
    );

    const content = JSON.stringify(
      {
        ok: true,
        summary: `${notifications.length} notification channel(s)`,
        data: notifications,
        meta: {
          durationMs,
          note: 'Credential values (webhook URLs, tokens, passwords) are never exposed.',
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
        : new CoolifyError('Failed to list notifications', 'UPSTREAM_ERROR', 500, false);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: false,
              summary: 'Failed to list notifications',
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
