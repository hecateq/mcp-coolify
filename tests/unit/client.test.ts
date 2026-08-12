import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { CoolifyClient } from '../../src/coolify/client.js';
import { createMockConfig } from '../fixtures/config.js';

const BASE_URL = 'https://coolify.example.com';

function createClient(overrides?: Record<string, unknown>) {
  const config = createMockConfig({
    coolifyUrl: BASE_URL,
    ...overrides,
  });
  return new CoolifyClient(config);
}

describe('CoolifyClient', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('health', () => {
    it('returns ok when health endpoint responds', async () => {
      nock(BASE_URL)
        .get('/api/health')
        .reply(200, { ok: true });

      const client = createClient({ coolifyApiToken: 'test-token' });
      const result = await client.health();
      expect(result.ok).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('returns false when health endpoint fails', async () => {
      nock(BASE_URL)
        .get('/api/health')
        .reply(500);

      const client = createClient({ coolifyApiToken: 'test-token' });
      const result = await client.health();
      expect(result.ok).toBe(false);
    });
  });

  describe('listProjects', () => {
    it('returns projects list', async () => {
      nock(BASE_URL)
        .get('/api/v1/projects')
        .reply(200, [
          { uuid: 'proj-1', name: 'Project 1' },
          { uuid: 'proj-2', name: 'Project 2' },
        ]);

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.listProjects();
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data).toHaveLength(2);
    });

    it('handles 401 unauthorized', async () => {
      nock(BASE_URL)
        .get('/api/v1/projects')
        .reply(401, { message: 'Unauthorized' });

      const client = createClient({ coolifyApiToken: 'test-token' });
      await expect(client.listProjects()).rejects.toMatchObject({
        code: 'AUTHENTICATION_FAILED',
      });
    });

    it('handles 404', async () => {
      nock(BASE_URL)
        .get('/api/v1/projects')
        .reply(404);

      const client = createClient({ coolifyApiToken: 'test-token' });
      await expect(client.listProjects()).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
      });
    });

    it('handles 429 rate limit', async () => {
      nock(BASE_URL)
        .get('/api/v1/projects')
        .reply(429, { message: 'Too many requests' }, { 'retry-after': '60' });

      const client = createClient({ coolifyApiToken: 'test-token' });
      await expect(client.listProjects()).rejects.toMatchObject({
        code: 'RATE_LIMITED',
        retryable: true,
      });
    });

    it('throws AUTHENTICATION_FAILED when no token is configured', async () => {
      const client = createClient({ coolifyApiToken: undefined });
      await expect(client.listProjects()).rejects.toMatchObject({
        code: 'AUTHENTICATION_FAILED',
      });
    });
  });

  describe('getProject', () => {
    it('returns project detail', async () => {
      nock(BASE_URL)
        .get('/api/v1/projects/proj-1')
        .reply(200, { uuid: 'proj-1', name: 'My Project', description: 'Test' });

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.getProject('proj-1');
      expect(response.data).toMatchObject({ uuid: 'proj-1', name: 'My Project' });
    });
  });

  describe('listResources', () => {
    it('returns resources with filters', async () => {
      nock(BASE_URL)
        .get('/api/v1/resources?project_uuid=proj-1')
        .reply(200, [{ uuid: 'app-1', name: 'App 1', type: 'application', status: 'running' }]);

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.listResources({ project_uuid: 'proj-1' });
      expect(response.data).toHaveLength(1);
    });
  });

  describe('deploy', () => {
    it('deploys a resource', async () => {
      nock(BASE_URL)
        .get('/api/v1/deploy?uuid=app-1')
        .reply(200, { deployment_uuid: 'deploy-1', status: 'queued' });

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.deployResource('app-1', 'application');
      expect(response.status).toBe(200);
    });
  });

  describe('timeout', () => {
    it('handles request timeout', async () => {
      nock(BASE_URL)
        .get('/api/v1/projects')
        .delayConnection(200)
        .reply(200);

      const modifiedClient = new CoolifyClient({
        ...createMockConfig({ coolifyUrl: BASE_URL }),
        coolifyApiToken: 'test-token',
      });

      await expect(
        modifiedClient.request({ method: 'GET', path: '/projects', timeout: 1 }),
      ).rejects.toMatchObject({
        code: 'REQUEST_TIMEOUT',
        retryable: true,
      });
    });
  });

  describe('token selection', () => {
    it('uses scoped read token when available', async () => {
      nock(BASE_URL)
        .get('/api/v1/projects')
        .matchHeader('authorization', 'Bearer read-token-123')
        .reply(200, []);
  
      const client = createClient({
        coolifyReadToken: 'read-token-123',
        coolifyApiToken: 'fallback-token',
      });
      await client.listProjects();
      // nock verifies the authorization header
    });
  
    it('uses deploy token for deploy operations', async () => {
      nock(BASE_URL)
        .get('/api/v1/deploy?uuid=app-1')
        .matchHeader('authorization', 'Bearer deploy-token-456')
        .reply(200, {});
  
      const client = createClient({
        coolifyDeployToken: 'deploy-token-456',
        coolifyApiToken: 'fallback-token',
      });
      await client.deployResource('app-1', 'application');
    });
  
    it('falls back to API token when scoped token not set', async () => {
      nock(BASE_URL)
        .get('/api/v1/projects')
        .matchHeader('authorization', 'Bearer main-token')
        .reply(200, []);
  
      const client = createClient({
        coolifyApiToken: 'main-token',
      });
      await client.listProjects();
    });
  });

  describe('createProject', () => {
    it('creates a project', async () => {
      nock(BASE_URL)
        .post('/api/v1/projects', { name: 'New Project' })
        .reply(201, { uuid: 'proj-new', name: 'New Project' });

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.createProject({ name: 'New Project' });
      expect(response.status).toBe(201);
      const data = response.data as Record<string, unknown>;
      expect(data['uuid']).toBe('proj-new');
    });
  });

  describe('createApplication', () => {
    it('creates a public application', async () => {
      nock(BASE_URL)
        .post('/api/v1/applications/public', {
          project_uuid: 'proj-1',
          environment_uuid: 'env-1',
          name: 'My App',
          source_type: 'public',
        })
        .reply(201, { uuid: 'app-1', name: 'My App' });

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.createApplication({
        project_uuid: 'proj-1',
        environment_uuid: 'env-1',
        name: 'My App',
        source_type: 'public',
      });
      expect(response.status).toBe(201);
    });

    it('creates a dockerfile application via correct endpoint', async () => {
      nock(BASE_URL)
        .post('/api/v1/applications/dockerfile')
        .reply(201, { uuid: 'app-2' });

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.createApplication({
        project_uuid: 'proj-1',
        environment_uuid: 'env-1',
        name: 'Docker App',
        source_type: 'dockerfile',
      });
      expect(response.status).toBe(201);
    });
  });

  describe('createService', () => {
    it('creates a service', async () => {
      nock(BASE_URL)
        .post('/api/v1/services', {
          project_uuid: 'proj-1',
          environment_uuid: 'env-1',
          name: 'My Service',
        })
        .reply(201, { uuid: 'svc-1', name: 'My Service' });

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.createService({
        project_uuid: 'proj-1',
        environment_uuid: 'env-1',
        name: 'My Service',
      });
      expect(response.status).toBe(201);
    });
  });

  describe('createDatabase', () => {
    it('creates a postgresql database', async () => {
      nock(BASE_URL)
        .post('/api/v1/databases/postgresql', {
          project_uuid: 'proj-1',
          environment_uuid: 'env-1',
          name: 'My DB',
        })
        .reply(201, { uuid: 'db-1', name: 'My DB' });

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.createDatabase('postgresql', {
        project_uuid: 'proj-1',
        environment_uuid: 'env-1',
        name: 'My DB',
      });
      expect(response.status).toBe(201);
    });

    it('creates a redis database', async () => {
      nock(BASE_URL)
        .post('/api/v1/databases/redis')
        .reply(201, { uuid: 'db-2' });

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.createDatabase('redis', {
        project_uuid: 'proj-1',
        environment_uuid: 'env-1',
        name: 'Redis Cache',
      });
      expect(response.status).toBe(201);
    });
  });

  describe('createEnvironment', () => {
    it('creates an environment within a project', async () => {
      nock(BASE_URL)
        .post('/api/v1/projects/proj-1/environments', { name: 'staging' })
        .reply(201, { uuid: 'env-staging', name: 'staging' });

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.createEnvironment('proj-1', { name: 'staging' });
      expect(response.status).toBe(201);
    });
  });

  describe('setEnvsBulk', () => {
    it('sets env vars on an application', async () => {
      nock(BASE_URL)
        .patch('/api/v1/applications/app-1/envs/bulk', {
          envs: [{ key: 'PORT', value: '3000' }],
        })
        .reply(200, { message: 'ok' });

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.setEnvsBulk('app-1', 'application', [
        { key: 'PORT', value: '3000' },
      ]);
      expect(response.status).toBe(200);
    });

    it('sets env vars on a service', async () => {
      nock(BASE_URL)
        .patch('/api/v1/services/svc-1/envs/bulk', {
          envs: [{ key: 'DEBUG', value: 'true' }],
        })
        .reply(200, { message: 'ok' });

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.setEnvsBulk('svc-1', 'service', [
        { key: 'DEBUG', value: 'true' },
      ]);
      expect(response.status).toBe(200);
    });

    it('sets env vars on a database', async () => {
      nock(BASE_URL)
        .patch('/api/v1/databases/db-1/envs/bulk', {
          envs: [{ key: 'MAX_CONNECTIONS', value: '100' }],
        })
        .reply(200, { message: 'ok' });

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.setEnvsBulk('db-1', 'database', [
        { key: 'MAX_CONNECTIONS', value: '100' },
      ]);
      expect(response.status).toBe(200);
    });
  });

  describe('getService / getDatabase', () => {
    it('gets a service by uuid', async () => {
      nock(BASE_URL)
        .get('/api/v1/services/svc-1')
        .reply(200, { uuid: 'svc-1', name: 'My Service' });

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.getService('svc-1');
      expect(response.status).toBe(200);
    });

    it('gets a database by uuid', async () => {
      nock(BASE_URL)
        .get('/api/v1/databases/db-1')
        .reply(200, { uuid: 'db-1', name: 'My DB' });

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.getDatabase('db-1');
      expect(response.status).toBe(200);
    });

    it('reads service env vars', async () => {
      nock(BASE_URL)
        .get('/api/v1/services/svc-1/envs')
        .reply(200, [{ uuid: 'ev-1', key: 'PORT', value: '3000' }]);

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.getServiceEnvs('svc-1');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('reads database env vars', async () => {
      nock(BASE_URL)
        .get('/api/v1/databases/db-1/envs')
        .reply(200, [{ uuid: 'ev-1', key: 'VERSION', value: '16' }]);

      const client = createClient({ coolifyApiToken: 'test-token' });
      const response = await client.getDatabaseEnvs('db-1');
      expect(response.status).toBe(200);
    });
  });
});
