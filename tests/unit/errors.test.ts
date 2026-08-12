import { describe, it, expect } from 'vitest';
import { CoolifyError, normalizeError, mapHttpStatusToError } from '../../src/coolify/errors.js';

describe('CoolifyError', () => {
  it('constructs with all fields', () => {
    const error = new CoolifyError('Test error', 'UPSTREAM_ERROR', 500, true, { detail: 'info' });
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('UPSTREAM_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.retryable).toBe(true);
    expect(error.upstreamBody).toEqual({ detail: 'info' });
    expect(error.name).toBe('CoolifyError');
  });
});

describe('normalizeError', () => {
  it('returns CoolifyError instances as-is', () => {
    const original = new CoolifyError('Original', 'VALIDATION_ERROR', 400, false);
    const result = normalizeError(original);
    expect(result).toBe(original);
  });

  it('detects 401 unauthorized', () => {
    const error = new Error('Request failed with status code 401');
    const result = normalizeError(error);
    expect(result.code).toBe('AUTHENTICATION_FAILED');
    expect(result.retryable).toBe(false);
  });

  it('detects 403 forbidden', () => {
    const error = new Error('403 Forbidden');
    const result = normalizeError(error);
    expect(result.code).toBe('PERMISSION_DENIED');
  });

  it('detects 404 not found', () => {
    const error = new Error('Resource not found');
    const result = normalizeError(error);
    expect(result.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('detects 429 rate limit', () => {
    const error = new Error('429 Too Many Requests - rate limit exceeded');
    const result = normalizeError(error);
    expect(result.code).toBe('RATE_LIMITED');
    expect(result.retryable).toBe(true);
  });

  it('detects timeout errors', () => {
    const error = new Error('The request timed out after 30 seconds');
    const result = normalizeError(error);
    expect(result.code).toBe('REQUEST_TIMEOUT');
    expect(result.retryable).toBe(true);
  });

  it('detects connection refused', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:8080');
    const result = normalizeError(error);
    expect(result.code).toBe('COOLIFY_UNAVAILABLE');
    expect(result.retryable).toBe(true);
  });

  it('handles unknown errors', () => {
    const error = new Error('Something unexpected happened');
    const result = normalizeError(error);
    expect(result.code).toBe('UPSTREAM_ERROR');
  });

  it('handles non-Error values', () => {
    const result = normalizeError('plain string error');
    expect(result.code).toBe('INTERNAL_ERROR');
    expect(result.message).toContain('internal');
  });
});

describe('mapHttpStatusToError', () => {
  it('maps 401 to AUTHENTICATION_FAILED', () => {
    const result = mapHttpStatusToError(401);
    expect(result.code).toBe('AUTHENTICATION_FAILED');
    expect(result.retryable).toBe(false);
  });

  it('maps 403 to PERMISSION_DENIED', () => {
    const result = mapHttpStatusToError(403);
    expect(result.code).toBe('PERMISSION_DENIED');
  });

  it('maps 404 to RESOURCE_NOT_FOUND', () => {
    const result = mapHttpStatusToError(404);
    expect(result.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('maps 429 to RATE_LIMITED', () => {
    const result = mapHttpStatusToError(429);
    expect(result.code).toBe('RATE_LIMITED');
    expect(result.retryable).toBe(true);
  });

  it('maps 422 to UPSTREAM_ERROR', () => {
    const result = mapHttpStatusToError(422);
    expect(result.code).toBe('UPSTREAM_ERROR');
  });

  it('maps 500-504 to COOLIFY_UNAVAILABLE', () => {
    expect(mapHttpStatusToError(500).code).toBe('COOLIFY_UNAVAILABLE');
    expect(mapHttpStatusToError(502).code).toBe('COOLIFY_UNAVAILABLE');
    expect(mapHttpStatusToError(503).code).toBe('COOLIFY_UNAVAILABLE');
    expect(mapHttpStatusToError(504).code).toBe('COOLIFY_UNAVAILABLE');
    expect(mapHttpStatusToError(500).retryable).toBe(true);
  });

  it('maps other 4xx to UPSTREAM_ERROR', () => {
    const result = mapHttpStatusToError(418);
    expect(result.code).toBe('UPSTREAM_ERROR');
  });

  it('maps unexpected status to UPSTREAM_ERROR', () => {
    const result = mapHttpStatusToError(999);
    expect(result.code).toBe('UPSTREAM_ERROR');
  });
});
