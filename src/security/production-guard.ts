import type { Config } from '../config/schema.js';

export interface ProductionGuardDecision {
  allowed: boolean;
  isProduction: boolean;
  environmentName?: string;
  reason?: string;
}

export function isProductionEnvironment(config: Config, environmentName?: string): boolean {
  if (!environmentName) return false;
  const envLower = environmentName.toLowerCase().trim();
  return config.productionEnvNames.includes(envLower);
}

export function checkProductionMutation(
  config: Config,
  environmentName: string | undefined,
  operation: 'deploy' | 'stop' | 'restart' | 'start' | 'env_write',
): ProductionGuardDecision {
  const isProd = isProductionEnvironment(config, environmentName);

  if (!isProd) {
    return { allowed: true, isProduction: false, environmentName };
  }

  if (config.denyProductionMutations) {
    return {
      allowed: false,
      isProduction: true,
      environmentName,
      reason: `Production mutations are denied — environment "${environmentName}" is protected (COOLIFY_DENY_PRODUCTION_MUTATIONS=true)`,
    };
  }

  if (operation === 'deploy' && !config.allowProductionDeploy) {
    return {
      allowed: false,
      isProduction: true,
      environmentName,
      reason: `Production deployments are disabled — set COOLIFY_ALLOW_PRODUCTION_DEPLOY=true to enable`,
    };
  }

  if (operation === 'stop' && !config.allowStop) {
    return {
      allowed: false,
      isProduction: true,
      environmentName,
      reason: `Stop operations are disabled — set COOLIFY_ALLOW_STOP=true to enable`,
    };
  }

  if (operation === 'env_write' && !config.allowEnvWrite) {
    return {
      allowed: false,
      isProduction: true,
      environmentName,
      reason: `Environment variable writes are disabled — set COOLIFY_ALLOW_ENV_WRITE=true to enable`,
    };
  }

  return { allowed: true, isProduction: true, environmentName };
}
