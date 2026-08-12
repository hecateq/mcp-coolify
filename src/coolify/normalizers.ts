import type {
  CoolifyProject,
  CoolifyEnvironment,
  CoolifyResource,
  CoolifyDeployment,
  CoolifyEnvVar,
  NormalizedProject,
  NormalizedEnvironment,
  NormalizedResource,
  NormalizedResourceDetail,
  NormalizedDeployment,
  NormalizedEnvVar,
  CoolifyGitHubApp,
  CoolifyGitHubRepository,
  CoolifyGitHubBranch,
  NormalizedGitHubApp,
  NormalizedGitHubRepository,
  NormalizedGitHubBranch,
  CoolifyScheduledTask,
  CoolifyTaskExecution,
  NormalizedScheduledTask,
  NormalizedTaskExecution,
  CoolifyServer,
  NormalizedServer,
  CoolifyTeam,
  CoolifyTeamMember,
  NormalizedTeam,
  NormalizedTeamMember,
  CoolifyBackupConfig,
  CoolifyBackupExecution,
  NormalizedBackupConfig,
  NormalizedBackupExecution,
  CoolifyStorageMount,
  NormalizedStorageMount,
  CoolifyDomain,
  NormalizedDomain,
  CoolifyRollbackImagesResponse,
  NormalizedRollbackImagesResponse,
  CoolifyS3Storage,
  NormalizedS3Storage,
  CoolifyS3ValidateResult,
  CoolifyNotificationSettings,
  NormalizedNotificationSettings,
  NotificationChannel,
  CoolifyDestination,
  NormalizedDestination,
  NormalizedVersion,
} from './types.js';

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }
  return result as T;
}

export function normalizeProject(project: CoolifyProject): NormalizedProject {
  return stripUndefined({
    uuid: project.uuid,
    name: project.name,
    description: project.description ?? undefined,
  });
}

export function normalizeProjects(projects: CoolifyProject[]): NormalizedProject[] {
  return projects.map(normalizeProject);
}

export function normalizeEnvironment(env: CoolifyEnvironment): NormalizedEnvironment {
  return stripUndefined({
    uuid: env.uuid,
    name: env.name,
    project_uuid: env.project_uuid,
  });
}

export function normalizeEnvironments(envs: CoolifyEnvironment[]): NormalizedEnvironment[] {
  return envs.map(normalizeEnvironment);
}

export function normalizeResource(resource: CoolifyResource): NormalizedResource {
  return stripUndefined({
    uuid: resource.uuid,
    name: resource.name,
    type: resource.type,
    status: resource.status,
    project_uuid: resource.project_uuid ?? undefined,
    environment_uuid: resource.environment_uuid ?? undefined,
    environment_name: resource.environment_name ?? undefined,
    fqdn: resource.fqdn ?? undefined,
  });
}

export function normalizeResources(resources: CoolifyResource[]): NormalizedResource[] {
  return resources.map(normalizeResource);
}

export function normalizeResourceDetail(
  resource: Record<string, unknown>,
): NormalizedResourceDetail {
  return stripUndefined({
    uuid: resource['uuid'] as string,
    name: resource['name'] as string,
    type: resource['type'] as NormalizedResourceDetail['type'],
    status: (resource['status'] as NormalizedResourceDetail['status']) || 'unknown',
    project_uuid: (resource['project_uuid'] as string) ?? undefined,
    environment_uuid: (resource['environment_uuid'] as string) ?? undefined,
    environment_name: (resource['environment_name'] as string) ?? undefined,
    fqdn: (resource['fqdn'] as string) ?? undefined,
    repository_url: (resource['repository_url'] as string) ?? undefined,
    branch: (resource['branch'] as string) ?? undefined,
    database_type: (resource['database_type'] as string) ?? (resource['type'] as string) ?? undefined,
    // Redact sensitive fields by default
    database_url: resource['database_url'] ? '[REDACTED]' : undefined,
    ports: (resource['ports'] as string) ?? undefined,
  });
}

export function normalizeDeployment(
  deployment: CoolifyDeployment,
): NormalizedDeployment {
  const resourceUuid =
    deployment.application_uuid || deployment.service_uuid || 'unknown';

  return stripUndefined({
    deployment_uuid: deployment.deployment_uuid,
    resource_uuid: resourceUuid,
    status: deployment.status,
    commit: deployment.commit ?? undefined,
    error: deployment.error ?? undefined,
    created_at: deployment.created_at,
    finished_at: deployment.finished_at ?? undefined,
  });
}

export function normalizeDeployments(deployments: CoolifyDeployment[]): NormalizedDeployment[] {
  return deployments.map(normalizeDeployment);
}

export function normalizeEnvVar(envVar: CoolifyEnvVar): NormalizedEnvVar {
  return stripUndefined({
    uuid: envVar.uuid,
    key: envVar.key,
    is_build_time: envVar.is_build_time ?? undefined,
    is_shown_once: envVar.is_shown_once ?? undefined,
  });
}

export function normalizeEnvVars(envVars: CoolifyEnvVar[]): NormalizedEnvVar[] {
  return envVars.map(normalizeEnvVar);
}

/* ─── GitHub Normalizers ─── */

export function normalizeGitHubApp(app: CoolifyGitHubApp): NormalizedGitHubApp {
  return stripUndefined({
    uuid: app.uuid,
    name: app.name,
    type: app.type ?? undefined,
    is_system_wide: app.is_system_wide ?? undefined,
  });
}

export function normalizeGitHubApps(apps: CoolifyGitHubApp[]): NormalizedGitHubApp[] {
  return apps.map(normalizeGitHubApp);
}

export function normalizeGitHubRepository(repo: CoolifyGitHubRepository): NormalizedGitHubRepository {
  return stripUndefined({
    id: repo.id,
    full_name: repo.full_name,
    name: repo.name,
    owner: repo.owner,
    private: repo.private,
    default_branch: repo.default_branch ?? undefined,
    url: repo.url ?? undefined,
    description: repo.description ?? undefined,
    language: repo.language ?? undefined,
  });
}

export function normalizeGitHubRepositories(repos: CoolifyGitHubRepository[]): NormalizedGitHubRepository[] {
  return repos.map(normalizeGitHubRepository);
}

export function normalizeGitHubBranch(branch: CoolifyGitHubBranch): NormalizedGitHubBranch {
  return stripUndefined({
    name: branch.name,
    commit_sha: branch.commit_sha ?? undefined,
    protected: branch.protected ?? undefined,
  });
}

export function normalizeGitHubBranches(branches: CoolifyGitHubBranch[]): NormalizedGitHubBranch[] {
  return branches.map(normalizeGitHubBranch);
}

/* ─── Scheduled Task Normalizers ─── */

export function normalizeScheduledTask(task: CoolifyScheduledTask): NormalizedScheduledTask {
  return stripUndefined({
    uuid: task.uuid,
    name: task.name,
    command: task.command,
    schedule: task.schedule,
    container: task.container ?? undefined,
    enabled: task.enabled,
    resource_uuid: task.resource_uuid ?? task.application_uuid ?? task.service_uuid ?? undefined,
    last_execution_status: task.last_execution_status ?? undefined,
  });
}

export function normalizeScheduledTasks(tasks: CoolifyScheduledTask[]): NormalizedScheduledTask[] {
  return tasks.map(normalizeScheduledTask);
}

export function normalizeTaskExecution(exec: CoolifyTaskExecution): NormalizedTaskExecution {
  return stripUndefined({
    uuid: exec.uuid,
    task_uuid: exec.task_uuid,
    status: exec.status,
    started_at: exec.started_at ?? undefined,
    finished_at: exec.finished_at ?? undefined,
    exit_code: exec.exit_code ?? undefined,
  });
}

export function normalizeTaskExecutions(execs: CoolifyTaskExecution[]): NormalizedTaskExecution[] {
  return execs.map(normalizeTaskExecution);
}

/* ─── Server Normalizers ─── */

export function normalizeServer(server: CoolifyServer): NormalizedServer {
  return stripUndefined({
    uuid: server.uuid,
    name: server.name,
    ip: server.ip ?? undefined,
    port: server.port ?? undefined,
    user: server.user ?? undefined,
    proxy_type: server.proxy_type ?? undefined,
    status: server.status ?? undefined,
    description: server.description ?? undefined,
  });
}

export function normalizeServers(servers: CoolifyServer[]): NormalizedServer[] {
  return servers.map(normalizeServer);
}

/* ─── Team Normalizers ─── */

export function normalizeTeam(team: CoolifyTeam): NormalizedTeam {
  return stripUndefined({
    id: team.id,
    name: team.name,
    description: team.description ?? undefined,
    personal_team: team.personal_team ?? undefined,
  });
}

export function normalizeTeamMember(member: CoolifyTeamMember): NormalizedTeamMember {
  return stripUndefined({
    id: member.id,
    name: member.name,
    role: member.role,
  });
}

export function normalizeTeamMembers(members: CoolifyTeamMember[]): NormalizedTeamMember[] {
  return members.map(normalizeTeamMember);
}

/* ─── Backup Normalizers ─── */

export function normalizeBackupConfig(config: CoolifyBackupConfig): NormalizedBackupConfig {
  return stripUndefined({
    uuid: config.uuid,
    database_uuid: config.database_uuid,
    schedule: config.schedule,
    destination_uuid: config.destination_uuid ?? undefined,
    retention: config.retention ?? undefined,
    enabled: config.enabled,
  });
}

export function normalizeBackupConfigs(configs: CoolifyBackupConfig[]): NormalizedBackupConfig[] {
  return configs.map(normalizeBackupConfig);
}

export function normalizeBackupExecution(exec: CoolifyBackupExecution): NormalizedBackupExecution {
  return stripUndefined({
    uuid: exec.uuid,
    backup_uuid: exec.backup_uuid,
    status: exec.status,
    size_bytes: exec.size_bytes ?? undefined,
    started_at: exec.started_at ?? undefined,
    finished_at: exec.finished_at ?? undefined,
    error_message: exec.error_message ?? undefined,
  });
}

export function normalizeBackupExecutions(execs: CoolifyBackupExecution[]): NormalizedBackupExecution[] {
  return execs.map(normalizeBackupExecution);
}

/* ─── Storage Normalizers ─── */

export function normalizeStorageMount(mount: CoolifyStorageMount): NormalizedStorageMount {
  return stripUndefined({
    uuid: mount.uuid,
    name: mount.name ?? undefined,
    storage_type: mount.storage_type ?? undefined,
    source: mount.source,
    destination: mount.destination,
    resource_uuid: mount.resource_uuid ?? mount.application_uuid ?? mount.service_uuid ?? mount.database_uuid ?? undefined,
  });
}

export function normalizeStorageMounts(mounts: CoolifyStorageMount[]): NormalizedStorageMount[] {
  return mounts.map(normalizeStorageMount);
}

/* ─── Domain Normalizers ─── */

export function normalizeDomain(domain: CoolifyDomain): NormalizedDomain {
  return stripUndefined({
    uuid: domain.uuid,
    domain: domain.domain,
    verified: domain.verified ?? undefined,
  });
}

export function normalizeDomains(domains: CoolifyDomain[]): NormalizedDomain[] {
  return domains.map(normalizeDomain);
}

/* ─── Application Rollback Normalizers ─── */

export function normalizeRollbackImagesResponse(
  data: CoolifyRollbackImagesResponse,
): NormalizedRollbackImagesResponse {
  const images = Array.isArray(data.images) ? data.images : [];
  return stripUndefined({
    current: data.current ?? undefined,
    images: images.map((img) =>
      stripUndefined({
        tag: img.tag,
        created_at: img.created_at ?? undefined,
        is_current: img.is_current ?? undefined,
      }),
    ),
  });
}

/* ─── S3 Storage Normalizers ─── */

export function normalizeS3Storage(storage: CoolifyS3Storage): NormalizedS3Storage {
  return stripUndefined({
    uuid: storage.uuid,
    name: storage.name,
    description: storage.description ?? undefined,
    endpoint: storage.endpoint,
    bucket: storage.bucket,
    region: storage.region,
    is_usable: storage.is_usable ?? undefined,
    team_id: storage.team_id ?? undefined,
    created_at: storage.created_at ?? undefined,
    updated_at: storage.updated_at ?? undefined,
  });
}

export function normalizeS3Storages(storages: CoolifyS3Storage[]): NormalizedS3Storage[] {
  return storages.map(normalizeS3Storage);
}

export function normalizeS3ValidateResult(result: CoolifyS3ValidateResult): { valid: boolean; message?: string } {
  return stripUndefined({
    valid: result.valid,
    message: result.message ?? undefined,
  });
}

/* ─── Notification Normalizers ─── */

export const NOTIFICATION_CHANNELS: readonly NotificationChannel[] = [
  'email',
  'discord',
  'slack',
  'telegram',
  'pushover',
  'webhook',
] as const;

/**
 * Fields whose values are secrets (webhook URLs, tokens, passwords).
 * They are never copied into normalized responses — only their presence may be surfaced.
 */
const SENSITIVE_NOTIFICATION_FIELDS = new Set([
  'smtp_password',
  'resend_api_key',
  'discord_webhook_url',
  'slack_webhook_url',
  'telegram_token',
  'pushover_api_token',
  'pushover_user_key',
  'webhook_url',
]);

function notificationEnabled(settings: CoolifyNotificationSettings, channel: string): boolean {
  const value = settings[`${channel}_enabled`];
  return value === true || value === 1 || value === 'true' || value === '1';
}

export function normalizeNotificationSettings(
  settings: CoolifyNotificationSettings,
  channel: NotificationChannel,
): NormalizedNotificationSettings {
  const keys = Object.keys(settings).filter((key) => key !== 'team_id');
  const configuredFields = keys.filter((key) => {
    const value = settings[key];
    if (value === undefined || value === null || value === '' || value === false) {
      return false;
    }
    if (SENSITIVE_NOTIFICATION_FIELDS.has(key)) {
      return false;
    }
    return true;
  });
  const hasSensitiveConfigured = keys.some((key) => {
    const value = settings[key];
    return (
      SENSITIVE_NOTIFICATION_FIELDS.has(key) &&
      value !== undefined &&
      value !== null &&
      value !== ''
    );
  });
  const enabled = notificationEnabled(settings, channel);
  const summary = `${channel} notifications ${enabled ? 'enabled' : 'disabled'}${
    hasSensitiveConfigured ? ' — credentials configured' : ''
  }`;
  return stripUndefined({
    channel,
    enabled,
    summary,
    configured_fields: configuredFields,
  });
}

export function normalizeNotificationSettingsList(
  settingsByChannel: Partial<Record<NotificationChannel, CoolifyNotificationSettings | undefined>>,
): NormalizedNotificationSettings[] {
  const result: NormalizedNotificationSettings[] = [];
  for (const channel of NOTIFICATION_CHANNELS) {
    const settings = settingsByChannel[channel];
    if (settings) {
      result.push(normalizeNotificationSettings(settings, channel));
    }
  }
  return result;
}

/* ─── Destination Normalizers ─── */

export function normalizeDestination(destination: CoolifyDestination): NormalizedDestination {
  return stripUndefined({
    uuid: destination.uuid,
    name: destination.name,
    network: destination.network,
    type: destination.type,
    server_uuid: destination.server_uuid ?? undefined,
    created_at: destination.created_at ?? undefined,
    updated_at: destination.updated_at ?? undefined,
  });
}

export function normalizeDestinations(destinations: CoolifyDestination[]): NormalizedDestination[] {
  return destinations.map(normalizeDestination);
}

/* ─── Version Normalizers ─── */

export function normalizeVersion(raw: unknown): NormalizedVersion {
  const version = typeof raw === 'string' ? raw : JSON.stringify(raw);
  return { version };
}
