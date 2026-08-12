import { describe, it, expect } from 'vitest';
import { isProductionEnvironment, checkProductionMutation } from '../../src/security/production-guard.js';
import { createMockConfig } from '../fixtures/config.js';

describe('Production Guard', () => {
  describe('isProductionEnvironment', () => {
    it('detects production environment by name', () => {
      const config = createMockConfig({});
      expect(isProductionEnvironment(config, 'production')).toBe(true);
      expect(isProductionEnvironment(config, 'prod')).toBe(true);
    });

    it('is case-insensitive', () => {
      const config = createMockConfig({});
      expect(isProductionEnvironment(config, 'PRODUCTION')).toBe(true);
      expect(isProductionEnvironment(config, 'Prod')).toBe(true);
    });

    it('returns false for non-production names', () => {
      const config = createMockConfig({});
      expect(isProductionEnvironment(config, 'staging')).toBe(false);
      expect(isProductionEnvironment(config, 'development')).toBe(false);
      expect(isProductionEnvironment(config, 'dev')).toBe(false);
    });

    it('returns false for undefined environment', () => {
      const config = createMockConfig({});
      expect(isProductionEnvironment(config, undefined)).toBe(false);
    });

    it('supports custom production env names', () => {
      const config = createMockConfig({
        productionEnvNames: ['live', 'prod-eu', 'prod-us'],
      });
      expect(isProductionEnvironment(config, 'live')).toBe(true);
      expect(isProductionEnvironment(config, 'prod-eu')).toBe(true);
      expect(isProductionEnvironment(config, 'production')).toBe(false);
    });
  });

  describe('checkProductionMutation', () => {
    it('allows mutations on non-production environments', () => {
      const config = createMockConfig({});
      const decision = checkProductionMutation(config, 'staging', 'deploy');
      expect(decision.allowed).toBe(true);
      expect(decision.isProduction).toBe(false);
    });

    it('denies ALL mutations when denyProductionMutations is true', () => {
      const config = createMockConfig({ denyProductionMutations: true });
      const decision = checkProductionMutation(config, 'production', 'deploy');
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('COOLIFY_DENY_PRODUCTION_MUTATIONS');
    });

    it('allows deploy on production when explicitly enabled', () => {
      const config = createMockConfig({
        denyProductionMutations: false,
        allowProductionDeploy: true,
      });
      const decision = checkProductionMutation(config, 'production', 'deploy');
      expect(decision.allowed).toBe(true);
    });

    it('denies deploy on production when allowProductionDeploy is false', () => {
      const config = createMockConfig({
        denyProductionMutations: false,
        allowProductionDeploy: false,
      });
      const decision = checkProductionMutation(config, 'production', 'deploy');
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('COOLIFY_ALLOW_PRODUCTION_DEPLOY');
    });

    it('denies stop on production when allowStop is false', () => {
      const config = createMockConfig({
        denyProductionMutations: false,
        allowStop: false,
      });
      const decision = checkProductionMutation(config, 'production', 'stop');
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('COOLIFY_ALLOW_STOP');
    });

    it('denies env_write on production when allowEnvWrite is false', () => {
      const config = createMockConfig({
        denyProductionMutations: false,
        allowEnvWrite: false,
      });
      const decision = checkProductionMutation(config, 'production', 'env_write');
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('COOLIFY_ALLOW_ENV_WRITE');
    });

    it('allows all operations on non-production regardless of flags', () => {
      const config = createMockConfig({
        denyProductionMutations: true,
        allowProductionDeploy: false,
        allowStop: false,
      });
      const decision = checkProductionMutation(config, 'development', 'stop');
      expect(decision.allowed).toBe(true);
      expect(decision.isProduction).toBe(false);
    });
  });
});
