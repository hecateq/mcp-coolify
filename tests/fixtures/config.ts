import type { Config, OperationMode } from '../../src/config/schema.js';

interface MockConfigOverrides {
  coolifyUrl?: string;
  coolifyApiToken?: string;
  coolifyReadToken?: string;
  coolifySensitiveToken?: string;
  coolifyWriteToken?: string;
  coolifyDeployToken?: string;
  serverApiKey?: string;
  operationMode?: OperationMode;
  transport?: 'stdio' | 'http';
  httpHost?: string;
  httpPort?: number;
  allowedProjectUuids?: string[];
  allowedEnvironmentUuids?: string[];
  allowedResourceUuids?: string[];
  productionEnvNames?: string[];
  denyProductionMutations?: boolean;
  allowProductionDeploy?: boolean;
  allowStop?: boolean;
  allowEnvWrite?: boolean;
  logMaxLines?: number;
  dashboardEnabled?: boolean;
  dashboardHost?: string;
  dashboardPort?: number;
}

export function createMockConfig(overrides: MockConfigOverrides = {}): Config {
  return {
    coolifyUrl: overrides.coolifyUrl ?? 'https://coolify.example.com',
    coolifyApiToken: overrides.coolifyApiToken,
    coolifyReadToken: overrides.coolifyReadToken,
    coolifySensitiveToken: overrides.coolifySensitiveToken,
    coolifyWriteToken: overrides.coolifyWriteToken,
    coolifyDeployToken: overrides.coolifyDeployToken,
    serverApiKey: overrides.serverApiKey,
    operationMode: overrides.operationMode ?? 'read-only',
    transport: overrides.transport ?? 'stdio',
    httpHost: overrides.httpHost ?? '0.0.0.0',
    httpPort: overrides.httpPort ?? 3000,
    allowedProjectUuids: overrides.allowedProjectUuids,
    allowedEnvironmentUuids: overrides.allowedEnvironmentUuids,
    allowedResourceUuids: overrides.allowedResourceUuids,
    productionEnvNames: overrides.productionEnvNames ?? ['production', 'prod'],
    denyProductionMutations: overrides.denyProductionMutations ?? true,
    allowProductionDeploy: overrides.allowProductionDeploy ?? false,
    allowStop: overrides.allowStop ?? false,
    allowEnvWrite: overrides.allowEnvWrite ?? false,
    logMaxLines: overrides.logMaxLines ?? 200,
    dashboardEnabled: overrides.dashboardEnabled ?? true,
    dashboardHost: overrides.dashboardHost ?? '127.0.0.1',
    dashboardPort: overrides.dashboardPort ?? 6489,
  };
}
