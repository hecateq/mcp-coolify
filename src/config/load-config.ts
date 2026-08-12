import { ConfigSchema, type Config } from './schema.js';
import type { ZodError } from 'zod';

export function loadConfig(): Config {
  const raw: Record<string, string | undefined> = {
    coolifyUrl: process.env['COOLIFY_URL'],
    coolifyApiToken: process.env['COOLIFY_API_TOKEN'],
    coolifyReadToken: process.env['COOLIFY_READ_TOKEN'],
    coolifySensitiveToken: process.env['COOLIFY_SENSITIVE_TOKEN'],
    coolifyWriteToken: process.env['COOLIFY_WRITE_TOKEN'],
    coolifyDeployToken: process.env['COOLIFY_DEPLOY_TOKEN'],

    transport: process.env['MCP_TRANSPORT'],
    httpHost: process.env['MCP_HTTP_HOST'],
    httpPort: process.env['MCP_HTTP_PORT'],
    serverApiKey: process.env['MCP_SERVER_API_KEY'],

    operationMode: process.env['COOLIFY_OPERATION_MODE'],

    allowedProjectUuids: process.env['COOLIFY_ALLOWED_PROJECT_UUIDS'],
    allowedEnvironmentUuids: process.env['COOLIFY_ALLOWED_ENVIRONMENT_UUIDS'],
    allowedResourceUuids: process.env['COOLIFY_ALLOWED_RESOURCE_UUIDS'],

    productionEnvNames: process.env['COOLIFY_PRODUCTION_ENV_NAMES'],
    denyProductionMutations: process.env['COOLIFY_DENY_PRODUCTION_MUTATIONS'],
    allowProductionDeploy: process.env['COOLIFY_ALLOW_PRODUCTION_DEPLOY'],
    allowStop: process.env['COOLIFY_ALLOW_STOP'],
    allowEnvWrite: process.env['COOLIFY_ALLOW_ENV_WRITE'],

    dashboardEnabled: process.env['MCP_DASHBOARD_ENABLED'],
    dashboardHost: process.env['MCP_DASHBOARD_HOST'],
    dashboardPort: process.env['MCP_DASHBOARD_PORT'],

    logMaxLines: process.env['COOLIFY_LOG_MAX_LINES'],
  };

  try {
    return ConfigSchema.parse(raw);
  } catch (error: unknown) {
    const zodError = error as ZodError;
    const issues = zodError.issues
      ?.map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n  ');
    throw new Error(
      `Configuration validation failed:\n  ${issues}\n\n` +
        'Check your environment variables against .env.example.\n' +
        `COOLIFY_URL is ${raw.coolifyUrl ? 'set' : 'MISSING — this is required!'}`,
    );
  }
}

export type { Config };
