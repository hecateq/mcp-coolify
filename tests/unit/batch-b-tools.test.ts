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
    listApplicationRollbackImages: vi.fn(),
    rollbackApplication: vi.fn(),
    listS3Storages: vi.fn(),
    createS3Storage: vi.fn(),
    validateS3Storage: vi.fn(),
  };
  vi.doMock('../../src/coolify/client.js', () => ({
    getCoolifyClient: () => mock,
  }));
  return mock;
}

describe('list_rollback_images', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogMutationAudit.mockClear();
    mockLoggerInfo.mockClear();
  });

  it('returns normalized rollback images', async () => {
    const client = createMockClient();
    client.listApplicationRollbackImages.mockResolvedValue({
      data: { current: 'v1', images: [{ tag: 'v1', created_at: '2026-01-01', is_current: true }, { tag: 'v0', created_at: '2025-12-01' }] },
      status: 200,
      headers: {},
    });
    const { handler } = await import('../../src/tools/read/list-rollback-images.js');
    const result = await handler({ application_uuid: 'app-123' });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.images).toHaveLength(2);
    expect(parsed.data.images[0].tag).toBe('v1');
    expect(parsed.data.current).toBe('v1');
    expect(result.isError).toBeUndefined();
  });

  it('returns error when API call fails', async () => {
    const client = createMockClient();
    client.listApplicationRollbackImages.mockRejectedValue(new Error('boom'));
    const { handler } = await import('../../src/tools/read/list-rollback-images.js');
    const result = await handler({ application_uuid: 'app-123' });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(false);
    expect(result.isError).toBe(true);
  });
});

describe('rollback_application', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogMutationAudit.mockClear();
    mockLoggerInfo.mockClear();
  });

  it('queues a rollback deployment in safe-write mode', async () => {
    loadConfigMock({ operationMode: 'safe-write' });
    const client = createMockClient();
    client.rollbackApplication.mockResolvedValue({
      data: { message: 'ok', deployment_uuid: 'dep-42' },
      status: 201,
      headers: {},
    });
    const { handler } = await import('../../src/tools/actions/rollback-application.js');
    const result = await handler({ application_uuid: 'app-123', image: 'v1' });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.deployment_uuid).toBe('dep-42');
    expect(client.rollbackApplication).toHaveBeenCalledWith('app-123', 'v1');
    expect(mockLogMutationAudit).toHaveBeenCalledWith('rollback_application', 'app-123', 'application', 'allowed');
  });

  it('allows rollback in deploy-only mode', async () => {
    loadConfigMock({ operationMode: 'deploy-only' });
    const client = createMockClient();
    client.rollbackApplication.mockResolvedValue({
      data: { message: 'ok', deployment_uuid: 'dep-7' },
      status: 201,
      headers: {},
    });
    const { handler } = await import('../../src/tools/actions/rollback-application.js');
    const result = await handler({ application_uuid: 'app-123', image: 'v1' });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(true);
  });

  it('denies in read-only mode', async () => {
    loadConfigMock({ operationMode: 'read-only' });
    const client = createMockClient();
    const { handler } = await import('../../src/tools/actions/rollback-application.js');
    const result = await handler({ application_uuid: 'app-123', image: 'v1' });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('POLICY_DENIED');
    expect(client.rollbackApplication).not.toHaveBeenCalled();
  });

  it('denies for non-allowed resource', async () => {
    loadConfigMock({ operationMode: 'safe-write', allowedResourceUuids: ['allowed-app'] });
    createMockClient();
    const { handler } = await import('../../src/tools/actions/rollback-application.js');
    const result = await handler({ application_uuid: 'app-123', image: 'v1' });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('POLICY_DENIED');
  });

  it('denies on production environment when production mutations are blocked', async () => {
    loadConfigMock({ operationMode: 'safe-write', productionEnvNames: ['production'], denyProductionMutations: true });
    const client = createMockClient();
    const { handler } = await import('../../src/tools/actions/rollback-application.js');
    const result = await handler({ application_uuid: 'app-123', image: 'v1', environment_name: 'production' });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('POLICY_DENIED');
    expect(client.rollbackApplication).not.toHaveBeenCalled();
  });

  it('requires image parameter', async () => {
    loadConfigMock({ operationMode: 'safe-write' });
    createMockClient();
    const { inputSchema } = await import('../../src/tools/actions/rollback-application.js');
    const parsed = inputSchema.safeParse({ application_uuid: 'app-123' });
    expect(parsed.success).toBe(false);
  });
});

describe('list_s3_storages', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogMutationAudit.mockClear();
    mockLoggerInfo.mockClear();
  });

  it('returns S3 storages without credentials and supports name filter', async () => {
    const client = createMockClient();
    client.listS3Storages.mockResolvedValue({
      data: [
        { uuid: 's3-1', name: 'Backup Bucket', endpoint: 'https://s3.amazonaws.com', bucket: 'backups', region: 'us-east-1', is_usable: true },
        { uuid: 's3-2', name: 'Logs Bucket', endpoint: 'https://s3.amazonaws.com', bucket: 'logs', region: 'eu-west-1' },
      ],
      status: 200,
      headers: {},
    });
    const { handler } = await import('../../src/tools/read/list-s3-storages.js');
    const result = await handler({ name: 'backup' });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(true);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].name).toBe('Backup Bucket');
    expect(JSON.stringify(parsed.data)).not.toContain('secret');
    expect(JSON.stringify(parsed.data)).not.toContain('key');
  });
});

describe('create_s3_storage', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogMutationAudit.mockClear();
    mockLoggerInfo.mockClear();
  });

  it('succeeds in safe-write mode and never returns credentials', async () => {
    loadConfigMock({ operationMode: 'safe-write' });
    const client = createMockClient();
    client.createS3Storage.mockResolvedValue({ data: { uuid: 's3-new' }, status: 201, headers: {} });
    const { handler } = await import('../../src/tools/actions/create-s3-storage.js');
    const result = await handler({
      name: 'My Bucket',
      endpoint: 'https://s3.amazonaws.com',
      bucket: 'data',
      region: 'us-east-1',
      key: 'AKIAEXAMPLE',
      secret: 'SUPERSECRET',
    });
    const text = result.content[0].text as string;
    const parsed = JSON.parse(text);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.uuid).toBe('s3-new');
    expect(text).not.toContain('AKIAEXAMPLE');
    expect(text).not.toContain('SUPERSECRET');
    expect(client.createS3Storage).toHaveBeenCalledWith(expect.objectContaining({ key: 'AKIAEXAMPLE', secret: 'SUPERSECRET' }));
    expect(mockLogMutationAudit).toHaveBeenCalledWith('s3_storage_create', 's3-new', 's3-storage', 'allowed');
  });

  it('denies in read-only mode', async () => {
    loadConfigMock({ operationMode: 'read-only' });
    const client = createMockClient();
    const { handler } = await import('../../src/tools/actions/create-s3-storage.js');
    const result = await handler({
      name: 'My Bucket',
      endpoint: 'https://s3.amazonaws.com',
      bucket: 'data',
      region: 'us-east-1',
      key: 'AKIAEXAMPLE',
      secret: 'SUPERSECRET',
    });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('POLICY_DENIED');
    expect(client.createS3Storage).not.toHaveBeenCalled();
  });

  it('denies in deploy-only mode', async () => {
    loadConfigMock({ operationMode: 'deploy-only' });
    createMockClient();
    const { handler } = await import('../../src/tools/actions/create-s3-storage.js');
    const result = await handler({
      name: 'My Bucket',
      endpoint: 'https://s3.amazonaws.com',
      bucket: 'data',
      region: 'us-east-1',
      key: 'AKIAEXAMPLE',
      secret: 'SUPERSECRET',
    });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('POLICY_DENIED');
  });

  it('requires secret fields', async () => {
    loadConfigMock({ operationMode: 'safe-write' });
    createMockClient();
    const { inputSchema } = await import('../../src/tools/actions/create-s3-storage.js');
    const parsed = inputSchema.safeParse({ name: 'x', endpoint: 'e', bucket: 'b', region: 'r', key: 'k' });
    expect(parsed.success).toBe(false);
  });
});

describe('validate_s3_storage', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogMutationAudit.mockClear();
    mockLoggerInfo.mockClear();
  });

  it('returns validation result in safe-write mode', async () => {
    loadConfigMock({ operationMode: 'safe-write' });
    const client = createMockClient();
    client.validateS3Storage.mockResolvedValue({
      data: { valid: true, message: 'S3 storage connection is valid.' },
      status: 200,
      headers: {},
    });
    const { handler } = await import('../../src/tools/actions/validate-s3-storage.js');
    const result = await handler({ s3_storage_uuid: 's3-1' });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.valid).toBe(true);
    expect(client.validateS3Storage).toHaveBeenCalledWith('s3-1');
  });

  it('denies in read-only mode', async () => {
    loadConfigMock({ operationMode: 'read-only' });
    const client = createMockClient();
    const { handler } = await import('../../src/tools/actions/validate-s3-storage.js');
    const result = await handler({ s3_storage_uuid: 's3-1' });
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('POLICY_DENIED');
    expect(client.validateS3Storage).not.toHaveBeenCalled();
  });
});