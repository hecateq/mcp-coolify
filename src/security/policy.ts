import type { Config, OperationMode } from '../config/schema.js';

export interface PolicyDecision {
  allowed: boolean;
  mode: OperationMode;
  reason?: string;
  requiresPermission: 'read' | 'deploy' | 'write';
}

export function checkOperationMode(
  config: Config,
  operation: 'read' | 'deploy' | 'write' | 'stop' | 'env_write',
): PolicyDecision {
  const mode = config.operationMode;

  switch (mode) {
    case 'read-only': {
      if (operation === 'read') {
        return { allowed: true, mode, requiresPermission: 'read' };
      }
      return {
        allowed: false,
        mode,
        reason: `Operation mode is 'read-only' — '${operation}' operations are not permitted`,
        requiresPermission: 'read',
      };
    }

    case 'deploy-only': {
      if (operation === 'read' || operation === 'deploy') {
        return {
          allowed: true,
          mode,
          requiresPermission: operation === 'deploy' ? 'deploy' : 'read',
        };
      }
      return {
        allowed: false,
        mode,
        reason: `Operation mode is 'deploy-only' — '${operation}' operations are not permitted. Only read and deploy allowed.`,
        requiresPermission: 'read',
      };
    }

    case 'safe-write': {
      if (operation === 'stop' && !config.allowStop) {
        return {
          allowed: false,
          mode,
          reason: 'Stop operations are disabled — set COOLIFY_ALLOW_STOP=true to enable',
          requiresPermission: 'write',
        };
      }
      if (operation === 'env_write' && !config.allowEnvWrite) {
        return {
          allowed: false,
          mode,
          reason: 'Environment variable writes are disabled — set COOLIFY_ALLOW_ENV_WRITE=true to enable',
          requiresPermission: 'write',
        };
      }
      const requiresPermission = operation === 'deploy' ? 'deploy' : operation === 'read' ? 'read' : 'write';
      return { allowed: true, mode, requiresPermission };
    }

    default: {
      return {
        allowed: false,
        mode: 'read-only',
        reason: 'Unknown operation mode',
        requiresPermission: 'read',
      };
    }
  }
}
