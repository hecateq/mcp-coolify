import { describe, it, expect } from 'vitest';
import { checkProjectAllowed, checkResourceAllowed, checkEnvironmentAllowed } from '../../src/security/scope.js';
import { createMockConfig } from '../fixtures/config.js';

describe('Scope Allowlist', () => {
  describe('checkProjectAllowed', () => {
    it('allows when no allowlist is set', () => {
      const config = createMockConfig({ allowedProjectUuids: undefined });
      const result = checkProjectAllowed(config, 'any-uuid');
      expect(result.allowed).toBe(true);
    });

    it('allows when UUID is in allowlist', () => {
      const config = createMockConfig({
        allowedProjectUuids: ['proj-1', 'proj-2', 'proj-3'],
      });
      const result = checkProjectAllowed(config, 'proj-2');
      expect(result.allowed).toBe(true);
    });

    it('denies when UUID is not in allowlist', () => {
      const config = createMockConfig({
        allowedProjectUuids: ['proj-1', 'proj-2'],
      });
      const result = checkProjectAllowed(config, 'proj-unknown');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in the allowed projects');
    });

    it('requires exact UUID match (not partial)', () => {
      const config = createMockConfig({
        allowedProjectUuids: ['proj-1'],
      });
      const result = checkProjectAllowed(config, 'proj-1-extra');
      expect(result.allowed).toBe(false);
    });

    it('allows when allowlist is empty array', () => {
      const config = createMockConfig({
        allowedProjectUuids: [],
      });
      const result = checkProjectAllowed(config, 'any-uuid');
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkResourceAllowed', () => {
    it('allows when no allowlist is set', () => {
      const config = createMockConfig({ allowedResourceUuids: undefined });
      const result = checkResourceAllowed(config, 'any-uuid');
      expect(result.allowed).toBe(true);
    });

    it('denies when UUID is not in allowlist', () => {
      const config = createMockConfig({
        allowedResourceUuids: ['res-1', 'res-2'],
      });
      const result = checkResourceAllowed(config, 'res-3');
      expect(result.allowed).toBe(false);
    });
  });

  describe('checkEnvironmentAllowed', () => {
    it('allows when no allowlist is set', () => {
      const config = createMockConfig({ allowedEnvironmentUuids: undefined });
      const result = checkEnvironmentAllowed(config, 'env-1');
      expect(result.allowed).toBe(true);
    });

    it('denies when not in allowlist', () => {
      const config = createMockConfig({
        allowedEnvironmentUuids: ['env-1'],
      });
      const result = checkEnvironmentAllowed(config, 'env-2');
      expect(result.allowed).toBe(false);
    });
  });
});
