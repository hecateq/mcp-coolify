import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../src/config/schema.js';

describe('ConfigSchema', () => {
  it('validates minimal required config', () => {
    const result = validateConfig({
      coolifyUrl: 'https://coolify.example.com',
    });
    expect(result.coolifyUrl).toBe('https://coolify.example.com');
    expect(result.transport).toBe('stdio');
    expect(result.operationMode).toBe('read-only');
    expect(result.logMaxLines).toBe(200);
  });

  it('strips trailing slashes from URL', () => {
    const result = validateConfig({
      coolifyUrl: 'https://coolify.example.com///',
    });
    expect(result.coolifyUrl).toBe('https://coolify.example.com');
  });

  it('defaults to stdio transport', () => {
    const result = validateConfig({
      coolifyUrl: 'https://coolify.example.com',
    });
    expect(result.transport).toBe('stdio');
  });

  it('defaults to read-only operation mode', () => {
    const result = validateConfig({
      coolifyUrl: 'https://coolify.example.com',
    });
    expect(result.operationMode).toBe('read-only');
  });

  it('parses allowed project UUIDs as array', () => {
    const result = validateConfig({
      coolifyUrl: 'https://coolify.example.com',
      allowedProjectUuids: 'uuid-1,uuid-2, uuid-3',
    });
    expect(result.allowedProjectUuids).toEqual(['uuid-1', 'uuid-2', 'uuid-3']);
  });

  it('parses production env names as array', () => {
    const result = validateConfig({
      coolifyUrl: 'https://coolify.example.com',
      productionEnvNames: 'production,prod,staging-prod',
    });
    expect(result.productionEnvNames).toEqual(['production', 'prod', 'staging-prod']);
  });

  it('parses boolean flags from strings', () => {
    const result = validateConfig({
      coolifyUrl: 'https://coolify.example.com',
      denyProductionMutations: 'true',
      allowStop: 'false',
      allowEnvWrite: 'true',
    });
    expect(result.denyProductionMutations).toBe(true);
    expect(result.allowStop).toBe(false);
    expect(result.allowEnvWrite).toBe(true);
  });

  it('coerces port to number', () => {
    const result = validateConfig({
      coolifyUrl: 'https://coolify.example.com',
      httpPort: '8080',
    });
    expect(result.httpPort).toBe(8080);
  });

  it('defaults log max lines to 200', () => {
    const result = validateConfig({
      coolifyUrl: 'https://coolify.example.com',
    });
    expect(result.logMaxLines).toBe(200);
  });

  it('rejects invalid URL', () => {
    expect(() =>
      validateConfig({
        coolifyUrl: 'not-a-url',
      }),
    ).toThrow();
  });

  it('rejects invalid operation mode', () => {
    expect(() =>
      validateConfig({
        coolifyUrl: 'https://coolify.example.com',
        operationMode: 'admin-mode',
      }),
    ).toThrow();
  });

  it('handles undefined optional fields gracefully', () => {
    const result = validateConfig({
      coolifyUrl: 'https://coolify.example.com',
    });
    expect(result.allowedProjectUuids).toBeUndefined();
    expect(result.allowedEnvironmentUuids).toBeUndefined();
    expect(result.allowedResourceUuids).toBeUndefined();
  });

  it('validates valid HTTP transport config', () => {
    const result = validateConfig({
      coolifyUrl: 'https://coolify.example.com',
      transport: 'http',
      httpHost: '127.0.0.1',
      httpPort: '3000',
      serverApiKey: 'test-key',
    });
    expect(result.transport).toBe('http');
    expect(result.httpHost).toBe('127.0.0.1');
    expect(result.httpPort).toBe(3000);
    expect(result.serverApiKey).toBe('test-key');
  });
});
