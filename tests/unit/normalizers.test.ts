import { describe, it, expect } from 'vitest';
import { normalizeProject, normalizeResource, normalizeDeployment, normalizeEnvVar, normalizeResourceDetail } from '../../src/coolify/normalizers.js';
import type { CoolifyProject, CoolifyResource, CoolifyDeployment, CoolifyEnvVar } from '../../src/coolify/types.js';

describe('Normalizers', () => {
  describe('normalizeProject', () => {
    it('normalizes a project', () => {
      const input: CoolifyProject = {
        id: 1,
        uuid: 'proj-1',
        name: 'My Project',
        description: 'A test project',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };
      const result = normalizeProject(input);
      expect(result).toEqual({
        uuid: 'proj-1',
        name: 'My Project',
        description: 'A test project',
      });
    });

    it('omits null description', () => {
      const input: CoolifyProject = { id: 1, uuid: 'proj-2', name: 'Project', description: null };
      const result = normalizeProject(input);
      expect(result.description).toBeUndefined();
    });
  });

  describe('normalizeResource', () => {
    it('normalizes a resource', () => {
      const input: CoolifyResource = {
        id: 1,
        uuid: 'res-1',
        name: 'My App',
        type: 'application',
        status: 'running',
        project_uuid: 'proj-1',
        environment_uuid: 'env-1',
        environment_name: 'production',
        fqdn: 'app.example.com',
      };
      const result = normalizeResource(input);
      expect(result).toMatchObject({
        uuid: 'res-1',
        name: 'My App',
        type: 'application',
        status: 'running',
        fqdn: 'app.example.com',
      });
    });
  });

  describe('normalizeDeployment', () => {
    it('normalizes a deployment', () => {
      const input: CoolifyDeployment = {
        deployment_uuid: 'deploy-1',
        application_uuid: 'app-1',
        status: 'finished',
        commit: 'abc123',
        created_at: '2024-01-01T00:00:00Z',
        finished_at: '2024-01-01T00:05:00Z',
      };
      const result = normalizeDeployment(input);
      expect(result).toMatchObject({
        deployment_uuid: 'deploy-1',
        resource_uuid: 'app-1',
        status: 'finished',
        commit: 'abc123',
      });
    });

    it('handles missing application/service UUID', () => {
      const input: CoolifyDeployment = {
        deployment_uuid: 'deploy-2',
        status: 'queued',
        created_at: '2024-01-01T00:00:00Z',
      };
      const result = normalizeDeployment(input);
      expect(result.resource_uuid).toBe('unknown');
    });
  });

  describe('normalizeEnvVar', () => {
    it('returns only keys and metadata, no values', () => {
      const input: CoolifyEnvVar = {
        uuid: 'env-1',
        key: 'DATABASE_URL',
        value: 'postgresql://secret@host/db',
        is_build_time: false,
        is_shown_once: true,
      };
      const result = normalizeEnvVar(input);
      expect(result).toMatchObject({
        uuid: 'env-1',
        key: 'DATABASE_URL',
        is_shown_once: true,
      });
      expect(result).not.toHaveProperty('value');
    });
  });

  describe('normalizeResourceDetail', () => {
    it('redacts database_url in resource details', () => {
      const input = {
        uuid: 'db-1',
        name: 'My DB',
        type: 'postgresql',
        status: 'running',
        database_url: 'postgresql://user:pass@host:5432/db',
      };
      const result = normalizeResourceDetail(input);
      expect(result.database_url).toBe('[REDACTED]');
    });
  });
});
