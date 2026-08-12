import { describe, it, expect } from 'vitest';
import { normalizeGitHubApp, normalizeGitHubRepository, normalizeGitHubBranch, normalizeScheduledTask, normalizeTaskExecution, normalizeServer, normalizeTeam, normalizeTeamMember, normalizeBackupConfig, normalizeBackupExecution, normalizeStorageMount, normalizeDomain, normalizeRollbackImagesResponse, normalizeS3Storage, normalizeS3Storages, normalizeS3ValidateResult, normalizeNotificationSettings, normalizeNotificationSettingsList, normalizeDestination, normalizeDestinations, normalizeVersion } from '../../src/coolify/normalizers.js';
import type { CoolifyGitHubApp, CoolifyGitHubRepository, CoolifyGitHubBranch, CoolifyScheduledTask, CoolifyTaskExecution, CoolifyServer, CoolifyTeam, CoolifyTeamMember, CoolifyBackupConfig, CoolifyBackupExecution, CoolifyStorageMount, CoolifyDomain, CoolifyRollbackImagesResponse, CoolifyS3Storage, CoolifyS3ValidateResult } from '../../src/coolify/types.js';

describe('New Normalizers', () => {
  describe('normalizeGitHubApp', () => {
    it('normalizes a GitHub App', () => {
      const input: CoolifyGitHubApp = {
        uuid: 'gh-1', name: 'My App', type: 'github', is_system_wide: false,
      };
      const result = normalizeGitHubApp(input);
      expect(result).toMatchObject({ uuid: 'gh-1', name: 'My App', type: 'github', is_system_wide: false });
    });
  });

  describe('normalizeGitHubRepository', () => {
    it('normalizes a repository', () => {
      const input: CoolifyGitHubRepository = {
        id: 1, full_name: 'org/repo', name: 'repo', owner: 'org', private: false, default_branch: 'main',
      };
      const result = normalizeGitHubRepository(input);
      expect(result).toMatchObject({ id: 1, full_name: 'org/repo', name: 'repo' });
    });
  });

  describe('normalizeGitHubBranch', () => {
    it('normalizes a branch', () => {
      const input: CoolifyGitHubBranch = { name: 'main', commit_sha: 'abc123', protected: true };
      const result = normalizeGitHubBranch(input);
      expect(result).toMatchObject({ name: 'main', commit_sha: 'abc123', protected: true });
    });
  });

  describe('normalizeScheduledTask', () => {
    it('normalizes a scheduled task', () => {
      const input: CoolifyScheduledTask = {
        uuid: 'task-1', name: 'Backup', command: 'backup.sh', schedule: '0 * * * *', enabled: true,
        application_uuid: 'app-1',
      };
      const result = normalizeScheduledTask(input);
      expect(result).toMatchObject({ uuid: 'task-1', name: 'Backup', resource_uuid: 'app-1' });
    });
  });

  describe('normalizeTaskExecution', () => {
    it('redacts output fields', () => {
      const input: CoolifyTaskExecution = {
        uuid: 'exec-1', task_uuid: 'task-1', status: 'completed', output: 'secret data', error_output: 'error',
      };
      const result = normalizeTaskExecution(input);
      expect(result).toHaveProperty('uuid', 'exec-1');
      expect(result).not.toHaveProperty('output');
      expect(result).not.toHaveProperty('error_output');
    });
  });

  describe('normalizeServer', () => {
    it('normalizes a server excluding SSH keys', () => {
      const input: CoolifyServer = {
        uuid: 'srv-1', name: 'My Server', ip: '10.0.0.1', port: 22, user: 'root', status: 'running',
      };
      const result = normalizeServer(input);
      expect(result).toMatchObject({ uuid: 'srv-1', name: 'My Server', ip: '10.0.0.1' });
      expect(result).not.toHaveProperty('private_key_uuid');
    });
  });

  describe('normalizeTeam', () => {
    it('normalizes a team', () => {
      const input: CoolifyTeam = { id: 1, name: 'My Team', personal_team: false };
      const result = normalizeTeam(input);
      expect(result).toMatchObject({ id: 1, name: 'My Team' });
    });
  });

  describe('normalizeTeamMember', () => {
    it('redacts email field', () => {
      const input: CoolifyTeamMember = { id: 1, name: 'John', email: 'john@example.com', role: 'admin' };
      const result = normalizeTeamMember(input);
      expect(result).toMatchObject({ id: 1, name: 'John', role: 'admin' });
      expect(result).not.toHaveProperty('email');
    });
  });

  describe('normalizeBackupConfig', () => {
    it('normalizes backup config', () => {
      const input: CoolifyBackupConfig = {
        uuid: 'bak-1', database_uuid: 'db-1', schedule: '0 2 * * *', retention: 7, enabled: true,
      };
      const result = normalizeBackupConfig(input);
      expect(result).toMatchObject({ uuid: 'bak-1', database_uuid: 'db-1', schedule: '0 2 * * *' });
    });
  });

  describe('normalizeBackupExecution', () => {
    it('normalizes backup execution', () => {
      const input: CoolifyBackupExecution = { uuid: 'be-1', backup_uuid: 'bak-1', status: 'completed', size_bytes: 1024 };
      const result = normalizeBackupExecution(input);
      expect(result).toMatchObject({ uuid: 'be-1', backup_uuid: 'bak-1', status: 'completed' });
    });
  });

  describe('normalizeStorageMount', () => {
    it('normalizes storage mount', () => {
      const input: CoolifyStorageMount = {
        uuid: 'st-1', source: '/data', destination: '/app/data', application_uuid: 'app-1',
      };
      const result = normalizeStorageMount(input);
      expect(result).toMatchObject({ uuid: 'st-1', source: '/data', destination: '/app/data', resource_uuid: 'app-1' });
    });
  });

  describe('normalizeDomain', () => {
    it('normalizes a domain', () => {
      const input: CoolifyDomain = { uuid: 'dom-1', domain: 'app.example.com', verified: true };
      const result = normalizeDomain(input);
      expect(result).toMatchObject({ uuid: 'dom-1', domain: 'app.example.com', verified: true });
    });
  });

  describe('normalizeRollbackImagesResponse', () => {
    it('normalizes rollback images', () => {
      const input: CoolifyRollbackImagesResponse = {
        current: 'v1',
        images: [
          { tag: 'v1', created_at: '2026-01-01', is_current: true },
          { tag: 'v0', created_at: '2025-12-01' },
        ],
      };
      const result = normalizeRollbackImagesResponse(input);
      expect(result.current).toBe('v1');
      expect(result.images).toHaveLength(2);
      expect(result.images[0]).toMatchObject({ tag: 'v1', is_current: true });
    });

    it('handles missing images as empty list', () => {
      const result = normalizeRollbackImagesResponse({});
      expect(result.images).toEqual([]);
    });
  });

  describe('normalizeS3Storage', () => {
    it('normalizes S3 storage excluding credentials', () => {
      const input: CoolifyS3Storage = {
        uuid: 's3-1',
        name: 'Backup',
        endpoint: 'https://s3.amazonaws.com',
        bucket: 'backups',
        region: 'us-east-1',
        is_usable: true,
        team_id: 1,
      };
      const result = normalizeS3Storage(input);
      expect(result).toMatchObject({ uuid: 's3-1', name: 'Backup', bucket: 'backups', region: 'us-east-1' });
      expect(JSON.stringify(result)).not.toContain('key');
      expect(JSON.stringify(result)).not.toContain('secret');
    });
  });

  describe('normalizeS3Storages', () => {
    it('normalizes a list of S3 storages', () => {
      const result = normalizeS3Storages([{ uuid: 's3-1', name: 'A', endpoint: 'e', bucket: 'b', region: 'r' }]);
      expect(result).toHaveLength(1);
    });
  });

  describe('normalizeS3ValidateResult', () => {
    it('normalizes validation result', () => {
      const input: CoolifyS3ValidateResult = { valid: true, message: 'S3 storage connection is valid.' };
      const result = normalizeS3ValidateResult(input);
      expect(result).toEqual({ valid: true, message: 'S3 storage connection is valid.' });
    });
  });
});

describe('normalizeNotificationSettings', () => {
  it('normalizes settings without leaking sensitive values', () => {
    const result = normalizeNotificationSettings(
      {
        webhook_enabled: true,
        webhook_url: 'https://hooks.example.com/secret-token',
        deployment_success_webhook_notifications: true,
        team_id: 1,
      },
      'webhook',
    );
    expect(result.channel).toBe('webhook');
    expect(result.enabled).toBe(true);
    expect(result.configured_fields).toContain('deployment_success_webhook_notifications');
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('hooks.example.com');
    expect(serialized).not.toContain('secret-token');
    expect(serialized).not.toContain('webhook_url');
  });
  it('marks disabled channels', () => {
    const result = normalizeNotificationSettings({ discord_enabled: false }, 'discord');
    expect(result.enabled).toBe(false);
    expect(result.summary).toContain('disabled');
  });
  it('summarizes credentials as configured without exposing them', () => {
    const result = normalizeNotificationSettings(
      { telegram_enabled: true, telegram_token: 'tok-123' },
      'telegram',
    );
    expect(result.summary).toContain('credentials configured');
    expect(JSON.stringify(result)).not.toContain('tok-123');
  });
});

describe('normalizeNotificationSettingsList', () => {
  it('maps channels in stable order, skipping missing', () => {
    const result = normalizeNotificationSettingsList({
      webhook: { webhook_enabled: true },
      discord: { discord_enabled: true },
    });
    expect(result.map((n) => n.channel)).toEqual(['discord', 'webhook']);
  });
});

describe('normalizeDestination', () => {
  it('normalizes a destination', () => {
    const result = normalizeDestination({
      uuid: 'd1',
      name: 'Main',
      network: 'coolify',
      type: 'standalone',
      server_uuid: 's1',
    });
    expect(result).toMatchObject({
      uuid: 'd1',
      name: 'Main',
      network: 'coolify',
      type: 'standalone',
      server_uuid: 's1',
    });
  });
});

describe('normalizeDestinations', () => {
  it('normalizes a list', () => {
    const result = normalizeDestinations([{ uuid: 'd1', name: 'A', network: 'n1', type: 'swarm' }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'A', network: 'n1', type: 'swarm' });
  });
});

describe('normalizeVersion', () => {
  it('normalizes a string version', () => {
    expect(normalizeVersion('4.0.0-beta.500')).toEqual({ version: '4.0.0-beta.500' });
  });
  it('serializes non-string payloads', () => {
    expect(normalizeVersion({ version: '1.2.3' })).toEqual({
      version: JSON.stringify({ version: '1.2.3' }),
    });
  });
});
