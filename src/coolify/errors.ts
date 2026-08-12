import type { ErrorCode } from './types.js';

export class CoolifyError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly statusCode: number,
    public readonly retryable: boolean = false,
    public readonly upstreamBody?: unknown,
  ) {
    super(message);
    this.name = 'CoolifyError';
  }
}

export function normalizeError(error: unknown): CoolifyError {
  if (error instanceof CoolifyError) {
    return error;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('unauthenticated')) {
      return new CoolifyError(
        'Authentication failed — check your Coolify API token',
        'AUTHENTICATION_FAILED',
        401,
        false,
      );
    }

    if (msg.includes('403') || msg.includes('forbidden')) {
      return new CoolifyError(
        'Permission denied — token does not have required scope',
        'PERMISSION_DENIED',
        403,
        false,
      );
    }

    if (msg.includes('404') || msg.includes('not found')) {
      return new CoolifyError('Resource not found', 'RESOURCE_NOT_FOUND', 404, false);
    }

    if (msg.includes('429') || msg.includes('rate limit')) {
      return new CoolifyError('Rate limited by Coolify API', 'RATE_LIMITED', 429, true);
    }

    if (msg.includes('timeout') || msg.includes('timed out')) {
      return new CoolifyError('Request timed out', 'REQUEST_TIMEOUT', 0, true);
    }

    if (msg.includes('econnrefused') || msg.includes('enotfound')) {
      return new CoolifyError('Coolify instance is unreachable', 'COOLIFY_UNAVAILABLE', 0, true);
    }

    return new CoolifyError(error.message, 'UPSTREAM_ERROR', 500, false);
  }

  return new CoolifyError(
    'An internal error occurred',
    'INTERNAL_ERROR',
    500,
    false,
  );
}

export function mapHttpStatusToError(status: number, body?: unknown): CoolifyError {
  switch (status) {
    case 401:
      return new CoolifyError(
        'Authentication failed — check your Coolify API token',
        'AUTHENTICATION_FAILED',
        401,
        false,
        body,
      );
    case 403:
      return new CoolifyError(
        'Permission denied — token does not have required scope',
        'PERMISSION_DENIED',
        403,
        false,
        body,
      );
    case 404:
      return new CoolifyError('Resource not found', 'RESOURCE_NOT_FOUND', 404, false, body);
    case 429:
      return new CoolifyError('Rate limited by Coolify API', 'RATE_LIMITED', 429, true, body);
    case 422:
      return new CoolifyError('Validation error from Coolify API', 'UPSTREAM_ERROR', 422, false, body);
    case 500:
    case 502:
    case 503:
    case 504:
      return new CoolifyError(
        'Coolify API encountered an error',
        'COOLIFY_UNAVAILABLE',
        status,
        true,
        body,
      );
    default:
      if (status >= 400) {
        return new CoolifyError(
          `Coolify API returned status ${status}`,
          'UPSTREAM_ERROR',
          status,
          false,
          body,
        );
      }
      return new CoolifyError('Unexpected response from Coolify API', 'UPSTREAM_ERROR', status, false, body);
  }
}
