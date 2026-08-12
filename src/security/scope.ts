import type { Config } from '../config/schema.js';

export interface ScopeDecision {
  allowed: boolean;
  reason?: string;
}

export function checkProjectAllowed(config: Config, projectUuid: string): ScopeDecision {
  const allowedUuids = config.allowedProjectUuids;
  if (!allowedUuids || allowedUuids.length === 0) {
    return { allowed: true };
  }

  if (allowedUuids.includes(projectUuid)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Project ${projectUuid} is not in the allowed projects list`,
  };
}

export function checkResourceAllowed(config: Config, resourceUuid: string): ScopeDecision {
  const allowedUuids = config.allowedResourceUuids;
  if (!allowedUuids || allowedUuids.length === 0) {
    return { allowed: true };
  }

  if (allowedUuids.includes(resourceUuid)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Resource ${resourceUuid} is not in the allowed resources list`,
  };
}

export function checkEnvironmentAllowed(config: Config, envUuid: string): ScopeDecision {
  const allowedUuids = config.allowedEnvironmentUuids;
  if (!allowedUuids || allowedUuids.length === 0) {
    return { allowed: true };
  }

  if (allowedUuids.includes(envUuid)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Environment ${envUuid} is not in the allowed environments list`,
  };
}
