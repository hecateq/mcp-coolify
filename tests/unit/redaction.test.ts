import { describe, it, expect } from 'vitest';
import { redactSecrets, redactAuthorizationHeader, redactEnvValue, isSecretField, redactObject } from '../../src/security/redaction.js';

describe('Secret Redaction', () => {
  describe('redactSecrets', () => {
    it('redacts Bearer tokens', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abcdef1234567890';
      const result = redactSecrets(input);
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiJ9');
      expect(result).toContain('Bearer [REDACTED]');
    });

    it('redacts password values in JSON-like strings', () => {
      const input = '{"password": "secret123", "username": "admin"}';
      const result = redactSecrets(input);
      expect(result).not.toContain('secret123');
    });

    it('does not modify safe text', () => {
      const input = 'This is a normal log message';
      const result = redactSecrets(input);
      expect(result).toBe(input);
    });
  });

  describe('redactAuthorizationHeader', () => {
    it('redacts authorization header value', () => {
      const headers = {
        Authorization: 'Bearer token-abc-123',
        'Content-Type': 'application/json',
      };
      const result = redactAuthorizationHeader(headers);
      expect(result['Authorization']).toBe('Bearer [REDACTED]');
      expect(result['Content-Type']).toBe('application/json');
    });

    it('redacts api-key header value', () => {
      const headers = {
        'X-API-Key': 'sk-secret-key-12345',
        'Content-Type': 'application/json',
      };
      const result = redactAuthorizationHeader(headers);
      expect(result['X-API-Key']).toBe('[REDACTED]');
    });

    it('redacts cookie header', () => {
      const headers = {
        Cookie: 'session=abc123; token=xyz',
        'Content-Type': 'application/json',
      };
      const result = redactAuthorizationHeader(headers);
      expect(result['Cookie']).toBe('[REDACTED]');
    });
  });

  describe('redactEnvValue', () => {
    it('redacts sensitive key values', () => {
      expect(redactEnvValue('DATABASE_URL', 'postgresql://user:pass@host/db')).toBe('[REDACTED]');
      expect(redactEnvValue('API_SECRET', 'my-secret')).toBe('[REDACTED]');
      expect(redactEnvValue('ACCESS_TOKEN', 'token-value')).toBe('[REDACTED]');
    });

    it('passes through non-sensitive keys', () => {
      expect(redactEnvValue('APP_NAME', 'MyApp')).toBe('MyApp');
      expect(redactEnvValue('NODE_ENV', 'production')).toBe('production');
    });
  });

  describe('isSecretField', () => {
    it('identifies secret field names', () => {
      expect(isSecretField('authorization')).toBe(true);
      expect(isSecretField('password')).toBe(true);
      expect(isSecretField('api_key')).toBe(true);
      expect(isSecretField('token')).toBe(true);
      expect(isSecretField('DATABASE_URL')).toBe(true);
    });

    it('returns false for safe field names', () => {
      expect(isSecretField('name')).toBe(false);
      expect(isSecretField('email')).toBe(false);
      expect(isSecretField('uuid')).toBe(false);
    });
  });

  describe('redactObject', () => {
    it('redacts sensitive keys in objects', () => {
      const obj = {
        name: 'MyApp',
        password: 'secret123',
        api_key: 'sk-abc',
        nested: {
          token: 'bearer-xyz',
          safe: 'value',
        },
      };
      const result = redactObject(obj);
      expect(result.password).toBe('[REDACTED]');
      expect(result.api_key).toBe('[REDACTED]');
      expect(result.name).toBe('MyApp');
      const nested = result.nested as Record<string, unknown>;
      expect(nested.token).toBe('[REDACTED]');
      expect(nested.safe).toBe('value');
    });
  });
});
