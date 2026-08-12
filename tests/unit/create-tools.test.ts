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
    allowEnvWrite: true,
    ...overrides,
  });
  vi.doMock('../../src/config/load-config.js', () => ({
    loadConfig: () => config,
  }));
  return config;
}

function createMockClient() {
  const mock = {
    createProject: vi.fn(),
    createApplication: vi.fn(),
    createService: vi.fn(),
    createDatabase: vi.fn(),
    createEnvironment: vi.fn(),
    setEnvsBulk: vi.fn(),
    setApplicationEnvsBulk: vi.fn(),
    getApplicationEnvs: vi.fn(),
    getServiceEnvs: vi.fn(),
    getDatabaseEnvs: vi.fn(),
  };
  vi.doMock('../../src/coolify/client.js', () => ({
    getCoolifyClient: () => mock,
  }));
  return mock;
}

describe('create_project', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogMutationAudit.mockClear();
    mockLoggerInfo.mockClear();
  });

  it('succeeds with valid input in safe-write mode', async () => {
    loadConfigMock({ operationMode: 'safe-write' });
    const client = createMockClient();
    client.createProject.mockResolvedValue({
      data: { uuid: 'proj-123', name: 'Test Project' },
      status: 201,
      headers: {},
    });

    const { handler } = await import('../../src/tools/actions/create-project.js');
    const result = await handler({ name: 'Test Project' });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.uuid).toBe('proj-123');
    expect(parsed.data.name).toBe('Test Project');
    expect(client.createProject).toHaveBeenCalledWith({ name: 'Test Project', description: undefined });
  });

  it('succeeds with description', async () => {
    loadConfigMock({ operationMode: 'safe-write' });
    const client = createMockClient();
    client.createProject.mockResolvedValue({
      data: { uuid: 'proj-456', name: 'My Project' },
      status: 201,
      headers: {},
    });

    const { handler } = await import('../../src/tools/actions/create-project.js');
    const result = await handler({ name: 'My Project', description: 'A test project' });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(true);
    expect(client.createProject).toHaveBeenCalledWith({ name: 'My Project', description: 'A test project' });
  });

  it('denies in read-only mode', async () => {
    loadConfigMock({ operationMode: 'read-only' });
    createMockClient();

    const { handler } = await import('../../src/tools/actions/create-project.js');
    const result = await handler({ name: 'Test Project' });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('POLICY_DENIED');
    expect(parsed.error.message).toContain('read-only');
  });

  it('denies in deploy-only mode', async () => {
    loadConfigMock({ operationMode: 'deploy-only' });
    createMockClient();

    const { handler } = await import('../../src/tools/actions/create-project.js');
    const result = await handler({ name: 'Test Project' });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('POLICY_DENIED');
  });

  it('returns error when API call fails', async () => {
    loadConfigMock({ operationMode: 'safe-write' });
    const client = createMockClient();
    client.createProject.mockRejectedValue(new Error('Network error'));

    const { handler } = await import('../../src/tools/actions/create-project.js');
    const result = await handler({ name: 'Test Project' });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBeDefined();
  });
});

describe('create_application', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogMutationAudit.mockClear();
    mockLoggerInfo.mockClear();
  });

  it('succeeds in safe-write mode', async () => {
    loadConfigMock({ operationMode: 'safe-write' });
    const client = createMockClient();
    client.createApplication.mockResolvedValue({
      data: { uuid: 'app-123', name: 'My App' },
      status: 201,
      headers: {},
    });

    const { handler } = await import('../../src/tools/actions/create-application.js');
    const result = await handler({
      project_uuid: '00000000-0000-0000-0000-000000000001',
      environment_uuid: '00000000-0000-0000-0000-000000000002',
      name: 'My App',
    });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.uuid).toBe('app-123');
    expect(parsed.data.type).toBe('application');
  });

  it('denied in read-only mode', async () => {
    loadConfigMock({ operationMode: 'read-only' });
    createMockClient();

    const { handler } = await import('../../src/tools/actions/create-application.js');
    const result = await handler({
      project_uuid: '00000000-0000-0000-0000-000000000001',
      environment_uuid: '00000000-0000-0000-0000-000000000002',
      name: 'My App',
    });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('POLICY_DENIED');
  });

  it('denied for non-allowed project', async () => {
    loadConfigMock({
      operationMode: 'safe-write',
      allowedProjectUuids: ['00000000-0000-0000-0000-000000000999'],
    });
    createMockClient();

    const { handler } = await import('../../src/tools/actions/create-application.js');
    const result = await handler({
      project_uuid: '00000000-0000-0000-0000-000000000001',
      environment_uuid: '00000000-0000-0000-0000-000000000002',
      name: 'My App',
    });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('POLICY_DENIED');
    expect(parsed.error.message).toContain('not in the allowed projects list');
  });

  it('denied on production environment when production mutations blocked', async () => {
    loadConfigMock({
      operationMode: 'safe-write',
      denyProductionMutations: true,
    });
    createMockClient();

    const { handler } = await import('../../src/tools/actions/create-application.js');
    const result = await handler({
      project_uuid: '00000000-0000-0000-0000-000000000001',
      environment_uuid: '00000000-0000-0000-0000-000000000002',
      name: 'My App',
      environment_name: 'production',
    });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.message).toContain('Production mutations');
  });
});

describe('create_database', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogMutationAudit.mockClear();
    mockLoggerInfo.mockClear();
  });

  it('succeeds and never returns password', async () => {
    loadConfigMock({ operationMode: 'safe-write' });
    const client = createMockClient();
    client.createDatabase.mockResolvedValue({
      data: {
        uuid: 'db-123',
        name: 'My DB',
        internal_db_url: 'postgresql://user:secret@localhost:5432/db',
      },
      status: 201,
      headers: {},
    });

    const { handler } = await import('../../src/tools/actions/create-database.js');
    const result = await handler({
      project_uuid: '00000000-0000-0000-0000-000000000001',
      environment_uuid: '00000000-0000-0000-0000-000000000002',
      server_uuid: '00000000-0000-0000-0000-000000000010',
      database_type: 'postgresql',
      name: 'My DB',
    });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.uuid).toBe('db-123');
    expect(parsed.data.name).toBe('My DB');
    expect(parsed.data.type).toBe('postgresql');
    // Never return connection strings or passwords
    expect(parsed.data.internal_db_url).toBeUndefined();
    expect(parsed.data.password).toBeUndefined();
    expect(parsed.data.connection_string).toBeUndefined();
  });

  it('validates database_type enum', async () => {
    // This tests schema validation — mongoose is not in the enum
    const { inputSchema } = await import('../../src/tools/actions/create-database.js');
    const result = inputSchema.safeParse({
      project_uuid: '00000000-0000-0000-0000-000000000001',
      environment_uuid: '00000000-0000-0000-0000-000000000002',
      server_uuid: '00000000-0000-0000-0000-000000000010',
      database_type: 'mongoose',
      name: 'Invalid DB',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid database types', async () => {
    const { inputSchema } = await import('../../src/tools/actions/create-database.js');
    const validTypes = ['postgresql', 'mysql', 'mongodb', 'redis', 'mariadb', 'keydb', 'dragonfly', 'clickhouse'];
    for (const dbType of validTypes) {
      const result = inputSchema.safeParse({
        project_uuid: '00000000-0000-0000-0000-000000000001',
        environment_uuid: '00000000-0000-0000-0000-000000000002',
        server_uuid: '00000000-0000-0000-0000-000000000010',
        database_type: dbType,
        name: `DB ${dbType}`,
      });
      expect(result.success).toBe(true);
    }
  });

  it('denied in safe-write mode on production with denyProductionMutations', async () => {
    loadConfigMock({
      operationMode: 'safe-write',
      denyProductionMutations: true,
    });
    createMockClient();

    const { handler } = await import('../../src/tools/actions/create-database.js');
    const result = await handler({
      project_uuid: '00000000-0000-0000-0000-000000000001',
      environment_uuid: '00000000-0000-0000-0000-000000000002',
      server_uuid: '00000000-0000-0000-0000-000000000010',
      database_type: 'postgresql',
      name: 'Prod DB',
      environment_name: 'production',
    });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('POLICY_DENIED');
  });
});

describe('create_environment', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogMutationAudit.mockClear();
  });

  it('succeeds in safe-write mode', async () => {
    loadConfigMock({ operationMode: 'safe-write' });
    const client = createMockClient();
    client.createEnvironment.mockResolvedValue({
      data: { uuid: 'env-123', name: 'staging' },
      status: 201,
      headers: {},
    });

    const { handler } = await import('../../src/tools/actions/create-environment.js');
    const result = await handler({
      project_uuid: '00000000-0000-0000-0000-000000000001',
      name: 'staging',
    });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.uuid).toBe('env-123');
    expect(client.createEnvironment).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001',
      { name: 'staging' },
    );
  });

  it('denied in read-only mode', async () => {
    loadConfigMock({ operationMode: 'read-only' });
    createMockClient();

    const { handler } = await import('../../src/tools/actions/create-environment.js');
    const result = await handler({
      project_uuid: '00000000-0000-0000-0000-000000000001',
      name: 'staging',
    });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('POLICY_DENIED');
  });
});

describe('set_environment_variables (bulk)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogMutationAudit.mockClear();
    mockLoggerInfo.mockClear();
  });

  it('succeeds with valid input and never returns values', async () => {
    loadConfigMock({ operationMode: 'safe-write', allowEnvWrite: true });
    const client = createMockClient();
    client.setEnvsBulk.mockResolvedValue({
      data: { message: 'ok' },
      status: 200,
      headers: {},
    });

    const { handler } = await import('../../src/tools/actions/set-env-vars-bulk.js');
    const result = await handler({
      resource_uuid: '00000000-0000-0000-0000-000000000001',
      resource_type: 'application',
      variables: [
        { key: 'DATABASE_URL', value: 'postgresql://user:pass@localhost/db' },
        { key: 'API_KEY', value: 'sk-secret-key-12345' },
      ],
    });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.updated).toBe(true);
    expect(parsed.data.keys).toEqual(['DATABASE_URL', 'API_KEY']);
    expect(parsed.data.count).toBe(2);
    // Values are NEVER returned
    expect(JSON.stringify(parsed.data)).not.toContain('secret');
    expect(JSON.stringify(parsed.data)).not.toContain('pass');
    expect(parsed.data.value).toBeUndefined();
  });

  it('denied when COOLIFY_ALLOW_ENV_WRITE is false', async () => {
    loadConfigMock({ operationMode: 'safe-write', allowEnvWrite: false });
    createMockClient();

    const { handler } = await import('../../src/tools/actions/set-env-vars-bulk.js');
    const result = await handler({
      resource_uuid: '00000000-0000-0000-0000-000000000001',
      resource_type: 'application',
      variables: [{ key: 'X', value: 'y' }],
    });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('POLICY_DENIED');
    expect(parsed.error.message).toContain('COOLIFY_ALLOW_ENV_WRITE');
  });

  it('validates key length constraint', async () => {
    const { inputSchema } = await import('../../src/tools/actions/set-env-vars-bulk.js');
    const result = inputSchema.safeParse({
      resource_uuid: '00000000-0000-0000-0000-000000000001',
      resource_type: 'application',
      variables: [{ key: '', value: 'valid' }],
    });
    expect(result.success).toBe(false);
  });

  it('validates value size limit (max 65536)', async () => {
    const { inputSchema } = await import('../../src/tools/actions/set-env-vars-bulk.js');
    const result = inputSchema.safeParse({
      resource_uuid: '00000000-0000-0000-0000-000000000001',
      resource_type: 'application',
      variables: [{ key: 'VALID_KEY', value: 'a'.repeat(65537) }],
    });
    expect(result.success).toBe(false);
  });

  it('validates max 50 variables', async () => {
    const { inputSchema } = await import('../../src/tools/actions/set-env-vars-bulk.js');
    const variables = Array.from({ length: 51 }, (_, i) => ({
      key: `KEY_${i}`,
      value: `value_${i}`,
    }));
    const result = inputSchema.safeParse({
      resource_uuid: '00000000-0000-0000-0000-000000000001',
      resource_type: 'application',
      variables,
    });
    expect(result.success).toBe(false);
  });

  it('denied in read-only mode even with allowEnvWrite', async () => {
    loadConfigMock({ operationMode: 'read-only', allowEnvWrite: true });
    createMockClient();

    const { handler } = await import('../../src/tools/actions/set-env-vars-bulk.js');
    const result = await handler({
      resource_uuid: '00000000-0000-0000-0000-000000000001',
      resource_type: 'application',
      variables: [{ key: 'X', value: 'y' }],
    });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(false);
  });

  it('constructs correct path for service resources', async () => {
    loadConfigMock({ operationMode: 'safe-write', allowEnvWrite: true });
    const client = createMockClient();
    client.setEnvsBulk.mockResolvedValue({ data: {}, status: 200, headers: {} });

    const { handler } = await import('../../src/tools/actions/set-env-vars-bulk.js');
    await handler({
      resource_uuid: '00000000-0000-0000-0000-000000000001',
      resource_type: 'service',
      variables: [{ key: 'PORT', value: '3000' }],
    });

    expect(client.setEnvsBulk).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001',
      'service',
      [{ key: 'PORT', value: '3000' }],
    );
  });

  it('constructs correct path for database resources', async () => {
    loadConfigMock({ operationMode: 'safe-write', allowEnvWrite: true });
    const client = createMockClient();
    client.setEnvsBulk.mockResolvedValue({ data: {}, status: 200, headers: {} });

    const { handler } = await import('../../src/tools/actions/set-env-vars-bulk.js');
    await handler({
      resource_uuid: '00000000-0000-0000-0000-000000000001',
      resource_type: 'database',
      variables: [{ key: 'MAX_CONNECTIONS', value: '100' }],
    });

    expect(client.setEnvsBulk).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001',
      'database',
      [{ key: 'MAX_CONNECTIONS', value: '100' }],
    );
  });
});

describe('create_service', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogMutationAudit.mockClear();
  });

  it('succeeds in safe-write mode', async () => {
    loadConfigMock({ operationMode: 'safe-write' });
    const client = createMockClient();
    client.createService.mockResolvedValue({
      data: { uuid: 'svc-123', name: 'My Service' },
      status: 201,
      headers: {},
    });

    const { handler } = await import('../../src/tools/actions/create-service.js');
    const result = await handler({
      project_uuid: '00000000-0000-0000-0000-000000000001',
      environment_uuid: '00000000-0000-0000-0000-000000000002',
      server_uuid: '00000000-0000-0000-0000-000000000010',
      name: 'My Service',
    });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.uuid).toBe('svc-123');
  });

  it('denied in read-only mode', async () => {
    loadConfigMock({ operationMode: 'read-only' });
    createMockClient();

    const { handler } = await import('../../src/tools/actions/create-service.js');
    const result = await handler({
      project_uuid: '00000000-0000-0000-0000-000000000001',
      environment_uuid: '00000000-0000-0000-0000-000000000002',
      server_uuid: '00000000-0000-0000-0000-000000000010',
      name: 'My Service',
    });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('POLICY_DENIED');
  });
});
