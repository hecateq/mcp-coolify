import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockConfig } from '../fixtures/config.js';

const mockLogMutationAudit = vi.fn();
const mockLoggerInfo = vi.fn();
vi.mock('../../src/observability/audit.js', () => ({
  logMutationAudit: (...args: unknown[]) => mockLogMutationAudit(...args),
}));
vi.mock('../../src/observability/logger.js', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function loadConfigMock(overrides: Record<string, unknown> = {}) {
  const config = createMockConfig({
    coolifyApiToken: 'test-token',
    operationMode: 'safe-write',
    ...overrides,
  });
  vi.doMock('../../src/config/load-config.js', () => ({
    loadConfig: () => config,
  }));
  return config;
}

function createMockClient() {
  const mock = {
    getNotification: vi.fn(),
    updateNotification: vi.fn(),
    listDestinations: vi.fn(),
    getDestination: vi.fn(),
    createDestination: vi.fn(),
    getDatabaseLogs: vi.fn(),
    getServiceLogs: vi.fn(),
    getVersion: vi.fn(),
  };
  vi.doMock('../../src/coolify/client.js', () => ({
    getCoolifyClient: () => mock,
  }));
  return mock;
}

describe('list_notifications', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogMutationAudit.mockClear();
    mockLoggerInfo.mockClear();
  });

  it('lists all channels without leaking webhook URL', async () => {
    const client = createMockClient();
    client.getNotification.mockImplementation(async (channel: string) => ({
      data: { [`${channel}_enabled`]: true, webhook_url: 'https://hooks.example.com/super-secret' },
      status: 200,
      headers: {},
    }));
    const { handler } = await import('../../src/tools/read/list-notifications.js');
    const result = await handler({});
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(true);
    expect(parsed.data).toHaveLength(6);
    const serialized = JSON.stringify(parsed);
    expect(serialized).not.toContain('super-secret');
    expect(serialized).not.toContain('hooks.example.com');
  });

  it('filters by a single channel', async () => {
    const client = createMockClient();
    client.getNotification.mockResolvedValue({ data: { webhook_enabled: true }, status: 200, headers: {} });
    const { handler } = await import('../../src/tools/read/list-notifications.js');
    const result = await handler({ channel: 'webhook' });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].channel).toBe('webhook');
  });
});

describe('update_notification', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogMutationAudit.mockClear();
    mockLoggerInfo.mockClear();
  });

  it('denies writes in read-only mode', async () => {
    loadConfigMock({ operationMode: 'read-only' });
    const client = createMockClient();
    const { handler } = await import('../../src/tools/actions/update-notification.js');
    const result = await handler({ channel: 'webhook', webhook_enabled: true });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('POLICY_DENIED');
    expect(client.updateNotification).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
  });

  it('updates settings and never echoes secret values', async () => {
    loadConfigMock({ operationMode: 'safe-write' });
    const client = createMockClient();
    client.updateNotification.mockResolvedValue({ data: {}, status: 200, headers: {} });
    const { handler } = await import('../../src/tools/actions/update-notification.js');
    const result = await handler({
      channel: 'webhook',
      webhook_url: 'https://hooks.example.com/secret',
      webhook_enabled: true,
    });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(true);
    expect(client.updateNotification).toHaveBeenCalledWith('webhook', {
      webhook_url: 'https://hooks.example.com/secret',
      webhook_enabled: true,
    });
    const serialized = JSON.stringify(parsed);
    expect(serialized).not.toContain('hooks.example.com');
    expect(serialized).not.toContain('secret');
    expect(parsed.data.updated_fields).toEqual(['webhook_url', 'webhook_enabled']);
  });

  it('rejects an empty patch with a validation error', async () => {
    const { inputSchema } = await import('../../src/tools/actions/update-notification.js');
    const parsed = inputSchema.safeParse({ channel: 'webhook' });
    expect(parsed.success).toBe(false);
  });
});

describe('create_destination', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogMutationAudit.mockClear();
    mockLoggerInfo.mockClear();
  });

  it('creates a destination in safe-write mode', async () => {
    loadConfigMock({ operationMode: 'safe-write' });
    const client = createMockClient();
    client.createDestination.mockResolvedValue({ data: { uuid: 'dest-1' }, status: 201, headers: {} });
    const { handler } = await import('../../src/tools/actions/create-destination.js');
    const result = await handler({ server_uuid: 'srv-1', network: 'coolify', name: 'Main' });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(true);
    expect(client.createDestination).toHaveBeenCalledWith('srv-1', { network: 'coolify', name: 'Main' });
    expect(parsed.data.uuid).toBe('dest-1');
  });

  it('rejects invalid network names via schema', async () => {
    const { inputSchema } = await import('../../src/tools/actions/create-destination.js');
    const parsed = inputSchema.safeParse({ server_uuid: 'srv-1', network: 'bad name!' });
    expect(parsed.success).toBe(false);
  });
});

describe('get_version', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLoggerInfo.mockClear();
  });

  it('returns the instance version', async () => {
    const client = createMockClient();
    client.getVersion.mockResolvedValue({ data: '4.0.0', status: 200, headers: {} });
    const { handler } = await import('../../src/tools/read/get-version.js');
    const result = await handler();
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.version).toBe('4.0.0');
  });
});
