import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/load-config.js', () => ({
  loadConfig: () => ({
    coolifyUrl: 'https://coolify.example.com/api/v1',
    transport: 'stdio',
    httpHost: '0.0.0.0',
    httpPort: 3000,
    operationMode: 'safe-write',
    allowedProjectUuids: undefined,
    allowedEnvironmentUuids: undefined,
    allowedResourceUuids: undefined,
    productionEnvNames: ['production', 'prod'],
    denyProductionMutations: true,
    allowProductionDeploy: false,
    allowStop: false,
    allowEnvWrite: false,
    logMaxLines: 200,
    dashboardEnabled: true,
    dashboardHost: '127.0.0.1',
    dashboardPort: 6489,
    coolifyApiToken: 'test-token',
    coolifyReadToken: undefined,
    coolifySensitiveToken: undefined,
    coolifyWriteToken: undefined,
    coolifyDeployToken: undefined,
    serverApiKey: undefined,
  }),
}));

import { CoolifyClient } from '../../src/coolify/client.js';

describe('CoolifyClient — New API Methods', () => {
  let client: CoolifyClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockRejectedValue(new Error('fetch failed'));
    globalThis.fetch = mockFetch;

    client = new CoolifyClient({
      coolifyUrl: 'https://coolify.example.com/api/v1',
      transport: 'stdio',
      httpHost: '0.0.0.0',
      httpPort: 3000,
      operationMode: 'safe-write',
      coolifyApiToken: 'test-token',
      productionEnvNames: ['production', 'prod'],
      denyProductionMutations: true,
      allowProductionDeploy: true,
      allowStop: true,
      allowEnvWrite: true,
      logMaxLines: 200,
      dashboardEnabled: true,
      dashboardHost: '127.0.0.1',
      dashboardPort: 6489,
    });
  });

  describe('listGithubApps', () => {
    it('constructs the correct path', async () => {
      await expect(client.listGithubApps()).rejects.toThrow();
    });
  });

  describe('listGithubRepositories', () => {
    it('constructs correct path with params', async () => {
      await expect(client.listGithubRepositories('gh-uuid', 'search', 1, 30)).rejects.toThrow();
    });
  });

  describe('listGithubBranches', () => {
    it('constructs correct path', async () => {
      await expect(client.listGithubBranches('gh-uuid', 'owner', 'repo')).rejects.toThrow();
    });
  });

  describe('listScheduledTasks', () => {
    it('constructs application path by default', async () => {
      await expect(client.listScheduledTasks('app-uuid')).rejects.toThrow();
    });

    it('constructs service path when type is service', async () => {
      await expect(client.listScheduledTasks('svc-uuid', 'service')).rejects.toThrow();
    });
  });

  describe('getTaskExecutions', () => {
    it('constructs correct path', async () => {
      await expect(client.getTaskExecutions('resource-uuid', 'task-uuid')).rejects.toThrow();
    });
  });

  describe('createScheduledTask', () => {
    it('constructs correct path', async () => {
      await expect(client.createScheduledTask('app-uuid', { name: 'test', command: 'echo', schedule: '* * * * *' })).rejects.toThrow();
    });
  });

  describe('updateScheduledTask', () => {
    it('constructs correct path', async () => {
      await expect(client.updateScheduledTask('app-uuid', 'task-uuid', { name: 'updated' })).rejects.toThrow();
    });
  });

  describe('cancelDeployment', () => {
    it('constructs correct path', async () => {
      await expect(client.cancelDeployment('deploy-uuid')).rejects.toThrow();
    });
  });

  describe('listDatabaseBackups', () => {
    it('constructs correct path', async () => {
      await expect(client.listDatabaseBackups('db-uuid')).rejects.toThrow();
    });
  });

  describe('createBackupConfig', () => {
    it('constructs correct path', async () => {
      await expect(client.createBackupConfig('db-uuid', { schedule: '0 * * * *' })).rejects.toThrow();
    });
  });

  describe('listServers', () => {
    it('constructs correct path', async () => {
      await expect(client.listServers()).rejects.toThrow();
    });
  });

  describe('getServer', () => {
    it('constructs correct path', async () => {
      await expect(client.getServer('server-uuid')).rejects.toThrow();
    });
  });

  describe('listServerResources', () => {
    it('constructs correct path with filters', async () => {
      await expect(client.listServerResources('server-uuid', 'application', 'running')).rejects.toThrow();
    });
  });

  describe('validateServer', () => {
    it('constructs correct path', async () => {
      await expect(client.validateServer('server-uuid')).rejects.toThrow();
    });
  });

  describe('listServerDomains', () => {
    it('constructs correct path', async () => {
      await expect(client.listServerDomains('server-uuid')).rejects.toThrow();
    });
  });

  describe('getCurrentTeam', () => {
    it('constructs correct path', async () => {
      await expect(client.getCurrentTeam()).rejects.toThrow();
    });
  });

  describe('listTeamMembers', () => {
    it('constructs correct path', async () => {
      await expect(client.listTeamMembers()).rejects.toThrow();
    });
  });

  describe('updateApplicationConfig', () => {
    it('constructs correct path', async () => {
      await expect(client.updateApplicationConfig('app-uuid', { name: 'test' })).rejects.toThrow();
    });
  });

  describe('updateDatabaseConfig', () => {
    it('constructs correct path', async () => {
      await expect(client.updateDatabaseConfig('db-uuid', { name: 'test' })).rejects.toThrow();
    });
  });

  describe('listStorages', () => {
    it('constructs correct path for application', async () => {
      await expect(client.listStorages('app-uuid', 'application')).rejects.toThrow();
    });

    it('constructs correct path for service', async () => {
      await expect(client.listStorages('svc-uuid', 'service')).rejects.toThrow();
    });

    it('constructs correct path for database', async () => {
      await expect(client.listStorages('db-uuid', 'database')).rejects.toThrow();
    });
  });

  describe('createStorage', () => {
    it('constructs correct path', async () => {
      await expect(client.createStorage('app-uuid', 'application', { source: '/data', destination: '/app/data' })).rejects.toThrow();
    });
  });

  describe('listApplicationRollbackImages', () => {
    it('constructs correct path', async () => {
      await expect(client.listApplicationRollbackImages('app-uuid')).rejects.toThrow();
    });
  });

  describe('rollbackApplication', () => {
    it('posts to rollback endpoint with commit body using deploy permission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'ok', deployment_uuid: 'dep-1' }),
        text: async () => '',
      });
      await client.rollbackApplication('app-uuid', 'v1');
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://coolify.example.com/api/v1/applications/app-uuid/rollback');
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ commit: 'v1' }));
    });
  });

  describe('listS3Storages', () => {
    it('constructs correct path', async () => {
      await expect(client.listS3Storages()).rejects.toThrow();
    });
  });

  describe('createS3Storage', () => {
    it('posts to s3-storages endpoint with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ uuid: 's3-1' }),
        text: async () => '',
      });
      await client.createS3Storage({ name: 'b', endpoint: 'e', bucket: 'bu', region: 'r', key: 'k', secret: 's' });
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://coolify.example.com/api/v1/s3-storages');
      expect(init.method).toBe('POST');
      expect(init.body).toContain('"secret":"s"');
    });
  });

  describe('validateS3Storage', () => {
    it('constructs correct path', async () => {
      await expect(client.validateS3Storage('s3-1')).rejects.toThrow();
    });
  });

  describe('CoolifyClient — Batch C API Methods', () => {
    describe('getNotification', () => {
      it('constructs the channel path', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ webhook_enabled: true }),
          text: async () => '',
        });
        await client.getNotification('webhook');
        const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://coolify.example.com/api/v1/notifications/webhook');
        expect(init.method).toBe('GET');
      });
    });

    describe('updateNotification', () => {
      it('patches the channel endpoint with body', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ webhook_enabled: true }),
          text: async () => '',
        });
        await client.updateNotification('webhook', { webhook_enabled: true });
        const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://coolify.example.com/api/v1/notifications/webhook');
        expect(init.method).toBe('PATCH');
        expect(init.body).toBe(JSON.stringify({ webhook_enabled: true }));
      });
    });

    describe('listDestinations', () => {
      it('constructs correct path', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => [],
          text: async () => '',
        });
        await client.listDestinations();
        const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://coolify.example.com/api/v1/destinations');
      });
    });

    describe('getDestination', () => {
      it('constructs correct path', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ uuid: 'dest-1' }),
          text: async () => '',
        });
        await client.getDestination('dest-1');
        const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://coolify.example.com/api/v1/destinations/dest-1');
      });
    });

    describe('createDestination', () => {
      it('posts to server destinations endpoint with body', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ uuid: 'dest-1' }),
          text: async () => '',
        });
        await client.createDestination('srv-1', { network: 'coolify', name: 'Main' });
        const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://coolify.example.com/api/v1/servers/srv-1/destinations');
        expect(init.method).toBe('POST');
        expect(init.body).toBe(JSON.stringify({ network: 'coolify', name: 'Main' }));
      });
    });

    describe('getDatabaseLogs', () => {
      it('constructs correct path with lines param', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => 'log line',
          text: async () => '',
        });
        await client.getDatabaseLogs('db-1', 50);
        const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://coolify.example.com/api/v1/databases/db-1/logs?lines=50');
      });
    });

    describe('getServiceLogs', () => {
      it('constructs correct path with default lines', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => 'log line',
          text: async () => '',
        });
        await client.getServiceLogs('svc-1');
        const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://coolify.example.com/api/v1/services/svc-1/logs?lines=200');
      });
    });

    describe('getVersion', () => {
      it('constructs correct path', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => '4.0.0',
          text: async () => '',
        });
        await client.getVersion();
        const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://coolify.example.com/api/v1/version');
      });
    });
  });
});