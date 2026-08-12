/* ─── Coolify API Resource Types ─── */

export type ResourceType = 'application' | 'service' | 'database' | 'postgresql' | 'mysql' | 'mariadb' | 'mongodb' | 'redis' | 'keydb' | 'dragonfly' | 'clickhouse';

export type ResourceStatus = 'running' | 'stopped' | 'degraded' | 'restarting' | 'exited' | 'unknown';

export type DeploymentStatus = 'queued' | 'in_progress' | 'finished' | 'failed' | 'cancelled-by-user';

export interface CoolifyProject {
  id: number;
  uuid: string;
  name: string;
  description?: string | null;
  environments?: CoolifyEnvironment[];
  created_at?: string;
  updated_at?: string;
}

export interface CoolifyEnvironment {
  id: number;
  uuid: string;
  name: string;
  project_uuid: string;
  created_at?: string;
  updated_at?: string;
}

export interface CoolifyResource {
  id: number;
  uuid: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  project_uuid?: string;
  environment_id?: number;
  environment_uuid?: string;
  environment_name?: string;
  fqdn?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CoolifyApplication {
  uuid: string;
  name: string;
  description?: string | null;
  fqdn?: string;
  repository_url?: string;
  branch?: string;
  build_pack?: string;
  ports?: string;
  status: ResourceStatus;
  project_uuid?: string;
  environment_uuid?: string;
  environment_name?: string;
  destination_uuid?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CoolifyService {
  uuid: string;
  name: string;
  type: string;
  status: ResourceStatus;
  project_uuid?: string;
  environment_uuid?: string;
  environment_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CoolifyDatabase {
  uuid: string;
  name: string;
  type: string;
  status: ResourceStatus;
  version?: string;
  internal_db_url?: string;
  external_db_url?: string;
  public_port?: number;
  project_uuid?: string;
  environment_uuid?: string;
  environment_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CoolifyDeployment {
  deployment_uuid: string;
  application_uuid?: string;
  service_uuid?: string;
  pull_request_id?: number;
  status: DeploymentStatus;
  commit?: string;
  is_webhook?: boolean;
  error?: string;
  created_at: string;
  updated_at?: string;
  finished_at?: string;
}

export interface CoolifyEnvVar {
  uuid: string;
  key: string;
  value: string;
  is_build_time?: boolean;
  is_literal?: boolean;
  is_multiline?: boolean;
  is_shown_once?: boolean;
  version?: string;
  application_uuid?: string;
  service_uuid?: string;
  database_uuid?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CoolifyHealthResponse {
  ok: boolean;
}

/* ─── GitHub Types ─── */

export interface CoolifyGitHubApp {
  uuid: string;
  name: string;
  type?: string;
  is_system_wide?: boolean;
  team_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CoolifyGitHubRepository {
  id: number;
  full_name: string;
  name: string;
  owner: string;
  private: boolean;
  default_branch?: string;
  url?: string;
  clone_url?: string;
  description?: string | null;
  language?: string | null;
  topics?: string[];
}

export interface CoolifyGitHubBranch {
  name: string;
  commit_sha?: string;
  protected?: boolean;
}

export interface NormalizedGitHubApp {
  uuid: string;
  name: string;
  type?: string;
  is_system_wide?: boolean;
}

export interface NormalizedGitHubRepository {
  id: number;
  full_name: string;
  name: string;
  owner: string;
  private: boolean;
  default_branch?: string;
  url?: string;
  description?: string;
  language?: string;
}

export interface NormalizedGitHubBranch {
  name: string;
  commit_sha?: string;
  protected?: boolean;
}

/* ─── Scheduled Task Types ─── */

export interface CoolifyScheduledTask {
  uuid: string;
  name: string;
  command: string;
  schedule: string;
  container?: string;
  timeout?: number;
  enabled: boolean;
  resource_uuid?: string;
  application_uuid?: string;
  service_uuid?: string;
  last_execution_status?: string;
  last_execution_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CoolifyTaskExecution {
  uuid: string;
  task_uuid: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  finished_at?: string;
  exit_code?: number;
  output?: string;
  error_output?: string;
  created_at?: string;
}

export interface NormalizedScheduledTask {
  uuid: string;
  name: string;
  command: string;
  schedule: string;
  container?: string;
  enabled: boolean;
  resource_uuid?: string;
  last_execution_status?: string;
}

export interface NormalizedTaskExecution {
  uuid: string;
  task_uuid: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  finished_at?: string;
  exit_code?: number;
  // output is redacted
  // error_output is redacted
}

/* ─── Server Types ─── */

export interface CoolifyServer {
  uuid: string;
  name: string;
  ip?: string;
  port?: number;
  user?: string;
  private_key_uuid?: string;
  proxy_type?: string;
  validation_logs?: string;
  description?: string | null;
  status?: string;
  settings?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface NormalizedServer {
  uuid: string;
  name: string;
  ip?: string;
  port?: number;
  user?: string;
  proxy_type?: string;
  status?: string;
  description?: string;
}

/* ─── Team Types ─── */

export interface CoolifyTeam {
  id: number;
  name: string;
  description?: string | null;
  personal_team?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CoolifyTeamMember {
  id: number;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  teams?: CoolifyTeam[];
  created_at?: string;
  updated_at?: string;
}

export interface NormalizedTeam {
  id: number;
  name: string;
  description?: string;
  personal_team?: boolean;
}

export interface NormalizedTeamMember {
  id: number;
  name: string;
  role: 'owner' | 'admin' | 'member';
  // email is policy-gated and redacted by default
}

/* ─── Backup Types ─── */

export interface CoolifyBackupConfig {
  uuid: string;
  database_uuid: string;
  schedule: string;
  destination_uuid?: string;
  retention?: number;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CoolifyBackupExecution {
  uuid: string;
  backup_uuid: string;
  status: 'running' | 'completed' | 'failed';
  size_bytes?: number;
  started_at?: string;
  finished_at?: string;
  error_message?: string;
  created_at?: string;
}

export interface NormalizedBackupConfig {
  uuid: string;
  database_uuid: string;
  schedule: string;
  destination_uuid?: string;
  retention?: number;
  enabled: boolean;
}

export interface NormalizedBackupExecution {
  uuid: string;
  backup_uuid: string;
  status: 'running' | 'completed' | 'failed';
  size_bytes?: number;
  started_at?: string;
  finished_at?: string;
  error_message?: string;
}

/* ─── Storage Types ─── */

export interface CoolifyStorageMount {
  uuid: string;
  name?: string;
  storage_type?: string;
  source: string;
  destination: string;
  resource_uuid?: string;
  application_uuid?: string;
  service_uuid?: string;
  database_uuid?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NormalizedStorageMount {
  uuid: string;
  name?: string;
  storage_type?: string;
  source: string;
  destination: string;
  resource_uuid?: string;
}

/* ─── Domain Types ─── */

export interface CoolifyDomain {
  uuid: string;
  domain: string;
  server_uuid?: string;
  application_uuid?: string;
  service_uuid?: string;
  verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface NormalizedDomain {
  uuid: string;
  domain: string;
  verified?: boolean;
}

/* ─── Application/Database Config Update Types ─── */

export interface ApplicationConfigUpdate {
  health_check?: boolean;
  cpu_limit?: string;
  memory_limit?: string;
  cpu_shares?: number;
  replicas?: number;
  ports?: string;
  build_pack?: string;
  base_directory?: string;
  dockerfile_location?: string;
  auto_deploy?: boolean;
  previews?: boolean;
  name?: string;
  description?: string;
  fqdn?: string;
}

export interface DatabaseConfigUpdate {
  cpu_limit?: string;
  memory_limit?: string;
  name?: string;
  description?: string;
  // Engine-specific fields use discriminated union pattern
  postgres?: Record<string, unknown>;
  mysql?: Record<string, unknown>;
  mariadb?: Record<string, unknown>;
  mongodb?: Record<string, unknown>;
  redis?: Record<string, unknown>;
}

/* ─── Scheduled Task Create/Update Types ─── */

export interface CreateScheduledTaskBody {
  name: string;
  command: string;
  schedule: string;
  container?: string;
  timeout?: number;
  enabled?: boolean;
}

export interface UpdateScheduledTaskBody {
  name?: string;
  command?: string;
  schedule?: string;
  container?: string;
  timeout?: number;
  enabled?: boolean;
}

/* ─── Backup Config Create Body ─── */

export interface CreateBackupConfigBody {
  schedule: string;
  destination_uuid?: string;
  retention?: number;
  enabled?: boolean;
}

/* ─── Storage Create Body ─── */

export interface CreateStorageBody {
  storage_type?: string;
  source: string;
  destination: string;
  name?: string;
}

/* ─── MCP Tool Response Types ─── */

export interface ToolResponse<T = unknown> {
  ok: boolean;
  summary: string;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
  };
  meta: {
    requestId: string;
    durationMs: number;
    truncated?: boolean;
  };
}

export type ErrorCode =
  | 'AUTHENTICATION_FAILED'
  | 'PERMISSION_DENIED'
  | 'POLICY_DENIED'
  | 'RESOURCE_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'COOLIFY_UNAVAILABLE'
  | 'REQUEST_TIMEOUT'
  | 'VALIDATION_ERROR'
  | 'UNSUPPORTED_OPERATION'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

/* ─── Normalized Types (for MCP responses) ─── */

export interface NormalizedProject {
  uuid: string;
  name: string;
  description?: string;
}

export interface NormalizedEnvironment {
  uuid: string;
  name: string;
  project_uuid: string;
}

export interface NormalizedResource {
  uuid: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  project_uuid?: string;
  environment_uuid?: string;
  environment_name?: string;
  fqdn?: string;
}

export interface NormalizedResourceDetail {
  uuid: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  project_uuid?: string;
  environment_uuid?: string;
  environment_name?: string;
  fqdn?: string;
  repository_url?: string;
  branch?: string;
  database_type?: string;
  // Sensitive fields are redacted by default
  database_url?: string;
  ports?: string;
}

export interface NormalizedDeployment {
  deployment_uuid: string;
  resource_uuid: string;
  status: DeploymentStatus;
  commit?: string;
  error?: string;
  created_at: string;
  finished_at?: string;
}

export interface NormalizedEnvVar {
  uuid: string;
  key: string;
  is_build_time?: boolean;
  is_shown_once?: boolean;
  // value is NEVER included in default responses
}

export interface ProjectOverview {
  project: NormalizedProject;
  environments: (NormalizedEnvironment & { resourceCount: number })[];
  resources: NormalizedResource[];
  recentDeployments: NormalizedDeployment[];
  summary: {
    totalResources: number;
    running: number;
    stopped: number;
    degraded: number;
    failedDeployments: number;
  };
}

/* ─── Client Types ─── */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface CoolifyRequestOptions {
  method: HttpMethod;
  path: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  timeout?: number;
  permission?: 'read' | 'write' | 'deploy';
}

export interface CoolifyResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

/* ─── Request Body Types ─── */

export interface CreateProjectBody {
  name: string;
  description?: string;
}

export interface CreateApplicationBody {
  project_uuid: string;
  environment_uuid: string;
  name: string;
  source_type?: 'public' | 'private-github-app' | 'private-deploy-key' | 'dockerfile' | 'dockerimage';
  repository_url?: string;
  branch?: string;
  build_pack?: string;
  port?: number;
  domains?: string;
  github_app_uuid?: string;
  private_key_uuid?: string;
  docker_compose_raw?: string;
}

export interface CreateServiceBody {
  project_uuid: string;
  environment_uuid: string;
  name: string;
  service_type?: string;
  docker_compose_raw?: string;
  server_uuid?: string;
}

export interface CreateDatabaseBody {
  project_uuid: string;
  environment_uuid: string;
  name: string;
  version?: string;
  server_uuid?: string;
}

export interface CreateEnvironmentBody {
  name: string;
  project_uuid?: string;
}

export interface EnvVarEntry {
  key: string;
  value: string;
}
