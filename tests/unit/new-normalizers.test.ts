import { describe, it, expect } from 'vitest';
import { normalizeGitHubApp, normalizeGitHubRepository, normalizeGitHubBranch, normalizeScheduledTask, normalizeTaskExecution, normalizeServer, normalizeTeam, normalizeTeamMember, normalizeBackupConfig, normalizeBackupExecution, normalizeStorageMount, normalizeDomain } from '../../src/coolify/normalizers.js';
import type { CoolifyGitHubApp, CoolifyGitHubRepository, CoolifyGitHubBranch, CoolifyScheduledTask, CoolifyTaskExecution, CoolifyServer, CoolifyTeam, CoolifyTeamMember, CoolifyBackupConfig, CoolifyBackupExecution, CoolifyStorageMount, CoolifyDomain } from '../../src/coolify/types.js';

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
});
