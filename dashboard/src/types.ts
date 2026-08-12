export interface KpiData {
  projects: number;
  applications: number;
  services: number;
  databases: number;
  deployments: number;
  running: number;
  stopped: number;
  degraded: number;
  failedDeployments: number;
}

export interface ActivityItem {
  resourceName: string;
  status: string;
  when: string;
  error?: string;
}

export interface OverviewData {
  kpi: KpiData;
  recentActivity: ActivityItem[];
}

export interface Project {
  uuid: string;
  name: string;
  description?: string;
  environments?: Environment[];
  resources?: Resource[];
}

export interface Environment {
  id: number;
  name: string;
  project_id: number;
}

export interface Resource {
  uuid: string;
  name: string;
  type: string;
  status: string;
  project_uuid: string;
  environment_name?: string;
  fqdn?: string;
}

export interface Deployment {
  deployment_uuid: string;
  resource_uuid: string;
  resource_name?: string;
  status: string;
  commit?: string;
  error?: string;
  created_at?: string;
  finished_at?: string;
}

export interface ScheduledTask {
  task_uuid: string;
  name: string;
  command: string;
  schedule: string;
  enabled: boolean;
  status?: string;
  last_execution?: string;
  resource_uuid: string;
  resource_name?: string;
}

export interface TaskExecution {
  uuid: string;
  status: string;
  started_at: string;
  finished_at?: string;
}

export interface Backup {
  uuid: string;
  database_uuid: string;
  database_name?: string;
  schedule?: string;
  enabled: boolean;
  status?: string;
  last_backup?: string;
}

export interface Server {
  uuid: string;
  name: string;
  description?: string;
  ip?: string;
  status?: string;
}

export interface McpTool {
  name: string;
  description: string;
  readOnly: boolean;
  destructive: boolean;
  idempotent: boolean;
}

export interface AuditEvent {
  event: string;
  resourceUuid?: string;
  resourceType?: string;
  result: string;
  reason?: string;
  timestamp: string;
}

export interface SearchResult {
  projects: { uuid: string; name: string }[];
  applications: { uuid: string; name: string }[];
  services: { uuid: string; name: string }[];
  databases: { uuid: string; name: string }[];
  servers: { uuid: string; name: string }[];
  deployments: { uuid: string; name: string }[];
  tasks: { uuid: string; name: string }[];
  tools: { uuid: string; name: string }[];
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface Team {
  id: number;
  uuid: string;
  name: string;
}
