import { describe, it, expect } from 'vitest';
import { checkOperationMode } from '../../src/security/policy.js';
import { createMockConfig } from '../fixtures/config.js';

describe('Operation Mode Policy', () => {
  describe('read-only mode', () => {
    const config = createMockConfig({ operationMode: 'read-only' });

    it('allows read operations', () => {
      const decision = checkOperationMode(config, 'read');
      expect(decision.allowed).toBe(true);
    });

    it('denies deploy operations', () => {
      const decision = checkOperationMode(config, 'deploy');
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('read-only');
    });

    it('denies write operations', () => {
      const decision = checkOperationMode(config, 'write');
      expect(decision.allowed).toBe(false);
    });

    it('denies stop operations', () => {
      const decision = checkOperationMode(config, 'stop');
      expect(decision.allowed).toBe(false);
    });

    it('denies env_write operations', () => {
      const decision = checkOperationMode(config, 'env_write');
      expect(decision.allowed).toBe(false);
    });
  });

  describe('deploy-only mode', () => {
    const config = createMockConfig({ operationMode: 'deploy-only' });

    it('allows read operations', () => {
      const decision = checkOperationMode(config, 'read');
      expect(decision.allowed).toBe(true);
    });

    it('allows deploy operations', () => {
      const decision = checkOperationMode(config, 'deploy');
      expect(decision.allowed).toBe(true);
    });

    it('denies write operations', () => {
      const decision = checkOperationMode(config, 'write');
      expect(decision.allowed).toBe(false);
    });
  });

  describe('safe-write mode', () => {
    it('allows read and deploy when stop and env_write are disabled', () => {
      const config = createMockConfig({
        operationMode: 'safe-write',
        allowStop: false,
        allowEnvWrite: false,
      });

      expect(checkOperationMode(config, 'read').allowed).toBe(true);
      expect(checkOperationMode(config, 'deploy').allowed).toBe(true);
    });

    it('denies stop when allowStop is false', () => {
      const config = createMockConfig({
        operationMode: 'safe-write',
        allowStop: false,
      });
      const decision = checkOperationMode(config, 'stop');
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('COOLIFY_ALLOW_STOP');
    });

    it('allows stop when allowStop is true', () => {
      const config = createMockConfig({
        operationMode: 'safe-write',
        allowStop: true,
      });
      const decision = checkOperationMode(config, 'stop');
      expect(decision.allowed).toBe(true);
    });

    it('denies env_write when allowEnvWrite is false', () => {
      const config = createMockConfig({
        operationMode: 'safe-write',
        allowEnvWrite: false,
      });
      const decision = checkOperationMode(config, 'env_write');
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('COOLIFY_ALLOW_ENV_WRITE');
    });

    it('allows env_write when allowEnvWrite is true', () => {
      const config = createMockConfig({
        operationMode: 'safe-write',
        allowEnvWrite: true,
      });
      const decision = checkOperationMode(config, 'env_write');
      expect(decision.allowed).toBe(true);
    });
  });
});
