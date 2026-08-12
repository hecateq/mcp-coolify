import { z } from 'zod';

export const TransportEnum = z.enum(['stdio', 'http']);
export type Transport = z.infer<typeof TransportEnum>;

export const OperationModeEnum = z.enum(['read-only', 'deploy-only', 'safe-write']);
export type OperationMode = z.infer<typeof OperationModeEnum>;

export const TokenAbilitiesSchema = z.object({
  read: z.boolean(),
  write: z.boolean(),
  deploy: z.boolean(),
});

export const ConfigSchema = z.object({
  coolifyUrl: z
    .string()
    .url('COOLIFY_URL must be a valid URL')
    .transform((url) => url.replace(/\/+$/, '')),

  coolifyApiToken: z.string().optional(),
  coolifyReadToken: z.string().optional(),
  coolifySensitiveToken: z.string().optional(),
  coolifyWriteToken: z.string().optional(),
  coolifyDeployToken: z.string().optional(),

  transport: TransportEnum.default('stdio'),
  httpHost: z.string().default('0.0.0.0'),
  httpPort: z.coerce.number().int().positive().max(65535).default(3000),
  serverApiKey: z.string().optional(),

  operationMode: OperationModeEnum.default('read-only'),

  allowedProjectUuids: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').map((u) => u.trim()).filter(Boolean) : undefined)),
  allowedEnvironmentUuids: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').map((u) => u.trim()).filter(Boolean) : undefined)),
  allowedResourceUuids: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').map((u) => u.trim()).filter(Boolean) : undefined)),

  productionEnvNames: z
    .string()
    .default('production,prod')
    .transform((s) => s.split(',').map((n) => n.trim().toLowerCase()).filter(Boolean)),
  denyProductionMutations: z
    .string()
    .default('true')
    .transform((s) => s === 'true'),
  allowProductionDeploy: z
    .string()
    .default('false')
    .transform((s) => s === 'true'),
  allowStop: z
    .string()
    .default('false')
    .transform((s) => s === 'true'),
  allowEnvWrite: z
    .string()
    .default('false')
    .transform((s) => s === 'true'),

  dashboardEnabled: z
    .string()
    .default('true')
    .transform((s) => s === 'true'),
  dashboardHost: z.string().default('127.0.0.1'),
  dashboardPort: z.coerce.number().int().positive().max(65535).default(6489),

  logMaxLines: z.coerce.number().int().positive().max(1000).default(200),
});

export type Config = z.infer<typeof ConfigSchema>;

export function validateConfig(raw: Record<string, string | undefined>): Config {
  return ConfigSchema.parse(raw);
}
