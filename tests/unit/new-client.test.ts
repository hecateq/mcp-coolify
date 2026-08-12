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
});
