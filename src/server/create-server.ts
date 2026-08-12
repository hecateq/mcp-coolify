import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import * as healthTool from '../tools/read/health.js';
import * as listProjectsTool from '../tools/read/projects.js';
import * as getProjectTool from '../tools/read/get-project.js';
import * as listResourcesTool from '../tools/read/resources.js';
import * as getResourceTool from '../tools/read/get-resource.js';
import * as projectOverviewTool from '../tools/read/project-overview.js';
import * as listDeploymentsTool from '../tools/read/deployments.js';
import * as getDeploymentTool from '../tools/read/get-deployment.js';
import * as logsTool from '../tools/read/logs.js';
import * as envVarsTool from '../tools/read/env-vars.js';
import * as listRollbackImagesTool from '../tools/read/list-rollback-images.js';
import * as listS3StoragesTool from '../tools/read/list-s3-storages.js';
import * as listNotificationsTool from '../tools/read/list-notifications.js';
import * as listDestinationsTool from '../tools/read/list-destinations.js';
import * as getDestinationTool from '../tools/read/get-destination.js';
import * as getDatabaseLogsTool from '../tools/read/get-database-logs.js';
import * as getServiceLogsTool from '../tools/read/get-service-logs.js';
import * as getVersionTool from '../tools/read/get-version.js';

import * as deployTool from '../tools/actions/deploy.js';
import * as restartTool from '../tools/actions/restart.js';
import * as startTool from '../tools/actions/start.js';
import * as stopTool from '../tools/actions/stop.js';
import * as setEnvVarTool from '../tools/actions/env-vars.js';
import * as createProjectTool from '../tools/actions/create-project.js';
import * as createApplicationTool from '../tools/actions/create-application.js';
import * as createServiceTool from '../tools/actions/create-service.js';
import * as createDatabaseTool from '../tools/actions/create-database.js';
import * as createEnvironmentTool from '../tools/actions/create-environment.js';
import * as setEnvVarsBulkTool from '../tools/actions/set-env-vars-bulk.js';
import * as rollbackApplicationTool from '../tools/actions/rollback-application.js';
import * as createS3StorageTool from '../tools/actions/create-s3-storage.js';
import * as validateS3StorageTool from '../tools/actions/validate-s3-storage.js';
import * as updateNotificationTool from '../tools/actions/update-notification.js';
import * as createDestinationTool from '../tools/actions/create-destination.js';

import * as githubAppsTool from '../tools/discovery/github-apps.js';
import * as repositoriesTool from '../tools/discovery/repositories.js';
import * as branchesTool from '../tools/discovery/branches.js';

import * as scheduledTasksListTool from '../tools/scheduled-tasks/list.js';
import * as taskExecutionsTool from '../tools/scheduled-tasks/executions.js';
import * as createScheduledTaskTool from '../tools/scheduled-tasks/create.js';
import * as updateScheduledTaskTool from '../tools/scheduled-tasks/update.js';
import * as executeScheduledTaskTool from '../tools/scheduled-tasks/execute.js';

import * as cancelDeploymentTool from '../tools/deployments/cancel.js';

import * as listBackupsTool from '../tools/backups/list.js';
import * as createBackupConfigTool from '../tools/backups/create-config.js';
import * as backupExecutionsTool from '../tools/backups/executions.js';
import * as runVolumeBackupTool from '../tools/backups/run.js';
import * as updateBackupConfigTool from '../tools/backups/update-config.js';

import * as listServersTool from '../tools/servers/list.js';
import * as getServerTool from '../tools/servers/get.js';
import * as serverResourcesTool from '../tools/servers/resources.js';
import * as validateServerTool from '../tools/servers/validate.js';
import * as serverDomainsTool from '../tools/servers/domains.js';

import * as currentTeamTool from '../tools/teams/current.js';
import * as teamMembersTool from '../tools/teams/members.js';

import * as updateAppConfigTool from '../tools/configuration/application.js';
import * as updateDbConfigTool from '../tools/configuration/database.js';

import * as listStoragesTool from '../tools/storage/list.js';
import * as createStorageTool from '../tools/storage/create.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'coolify',
    version: '1.0.0',
  });

  // ─── Read Tools ───
  server.registerTool(
    'coolify_health',
    {
      description:
        'Check Coolify API and MCP server connectivity. Returns health status, auth status, and latency. No secrets in response.',
      inputSchema: healthTool.inputSchema,
      annotations: healthTool.annotations,
    },
    healthTool.handler,
  );

  server.registerTool(
    'coolify_list_projects',
    {
      description: 'List all Coolify projects with optional name filter.',
      inputSchema: listProjectsTool.inputSchema,
      annotations: listProjectsTool.annotations,
    },
    listProjectsTool.handler,
  );

  server.registerTool(
    'coolify_get_project',
    {
      description: 'Get a single project by UUID with its environments and resource counts.',
      inputSchema: getProjectTool.inputSchema,
      annotations: getProjectTool.annotations,
    },
    getProjectTool.handler,
  );

  server.registerTool(
    'coolify_list_resources',
    {
      description:
        'List all resources with filters: project_uuid, environment_uuid, resource_type, status, search.',
      inputSchema: listResourcesTool.inputSchema,
      annotations: listResourcesTool.annotations,
    },
    listResourcesTool.handler,
  );

  server.registerTool(
    'coolify_get_resource',
    {
      description:
        'Get a single resource detail by UUID and type. Sensitive fields are redacted.',
      inputSchema: getResourceTool.inputSchema,
      annotations: getResourceTool.annotations,
    },
    getResourceTool.handler,
  );

  server.registerTool(
    'coolify_project_overview',
    {
      description:
        'High-level project overview: project info, all environments, resources with status, recent deployments, and health summary. Optimized to prevent multiple separate calls.',
      inputSchema: projectOverviewTool.inputSchema,
      annotations: projectOverviewTool.annotations,
    },
    projectOverviewTool.handler,
  );

  server.registerTool(
    'coolify_list_deployments',
    {
      description:
        'List deployments with filters: resource_uuid, status, limit. Newest first.',
      inputSchema: listDeploymentsTool.inputSchema,
      annotations: listDeploymentsTool.annotations,
    },
    listDeploymentsTool.handler,
  );

  server.registerTool(
    'coolify_get_deployment',
    {
      description:
        'Get deployment detail by UUID: status, timestamps, commit info, error summary.',
      inputSchema: getDeploymentTool.inputSchema,
      annotations: getDeploymentTool.annotations,
    },
    getDeploymentTool.handler,
  );

  server.registerTool(
    'coolify_get_application_logs',
    {
      description:
        'Get application logs with configurable line count (capped by COOLIFY_LOG_MAX_LINES). Secrets are redacted.',
      inputSchema: logsTool.inputSchema,
      annotations: logsTool.annotations,
    },
    logsTool.handler,
  );

  server.registerTool(
    'coolify_list_environment_variables',
    {
      description:
        'List environment variables for a resource. Returns keys and metadata only — VALUES ARE NEVER RETURNED.',
      inputSchema: envVarsTool.inputSchema,
      annotations: envVarsTool.annotations,
    },
    envVarsTool.handler,
  );

  server.registerTool(
    'coolify_list_rollback_images',
    {
      description: 'List available Docker images for rolling back an application. Returns current tag and available image tags.',
      inputSchema: listRollbackImagesTool.inputSchema,
      annotations: listRollbackImagesTool.annotations,
    },
    listRollbackImagesTool.handler,
  );

  server.registerTool(
    'coolify_list_s3_storages',
    {
      description: 'List all S3 storages for the authenticated team with optional name filter. Credentials are NEVER returned.',
      inputSchema: listS3StoragesTool.inputSchema,
      annotations: listS3StoragesTool.annotations,
    },
    listS3StoragesTool.handler,
  );

  // ─── Action Tools ───
  server.registerTool(
    'coolify_deploy',
    {
      description:
        'Deploy a resource. Subject to operation mode, allowlist, and production guard policies.',
      inputSchema: deployTool.inputSchema,
      annotations: deployTool.annotations,
    },
    deployTool.handler,
  );

  server.registerTool(
    'coolify_rollback_application',
    {
      description: 'Queue a rollback deployment for an application to a previous image tag/commit. Deploy-only operation subject to operation mode, allowlist, and production guard policies. Audit: coolify.application.rollback',
      inputSchema: rollbackApplicationTool.inputSchema,
      annotations: rollbackApplicationTool.annotations,
    },
    rollbackApplicationTool.handler,
  );

  server.registerTool(
    'coolify_restart',
    {
      description: 'Restart a resource. Production policy check is mandatory.',
      inputSchema: restartTool.inputSchema,
      annotations: restartTool.annotations,
    },
    restartTool.handler,
  );

  server.registerTool(
    'coolify_start',
    {
      description: 'Start a stopped resource.',
      inputSchema: startTool.inputSchema,
      annotations: startTool.annotations,
    },
    startTool.handler,
  );

  server.registerTool(
    'coolify_stop',
    {
      description:
        'Stop a resource. DEFAULT DISABLED — COOLIFY_ALLOW_STOP must be true. Marked destructive.',
      inputSchema: stopTool.inputSchema,
      annotations: stopTool.annotations,
    },
    stopTool.handler,
  );

  server.registerTool(
    'coolify_set_environment_variable',
    {
      description:
        'Set an environment variable on a resource. DEFAULT DISABLED — COOLIFY_ALLOW_ENV_WRITE must be true. Value is NEVER returned in response.',
      inputSchema: setEnvVarTool.inputSchema,
      annotations: setEnvVarTool.annotations,
    },
    setEnvVarTool.handler,
  );

  // ─── New Action Tools (safe-write required) ───
  server.registerTool(
    'coolify_create_project',
    {
      description: 'Create a new project. Requires safe-write operation mode.',
      inputSchema: createProjectTool.inputSchema,
      annotations: createProjectTool.annotations,
    },
    createProjectTool.handler,
  );

  server.registerTool(
    'coolify_create_environment',
    {
      description: 'Create a new environment within a project. Requires safe-write operation mode.',
      inputSchema: createEnvironmentTool.inputSchema,
      annotations: createEnvironmentTool.annotations,
    },
    createEnvironmentTool.handler,
  );

  server.registerTool(
    'coolify_create_application',
    {
      description: 'Create a new application in a project environment. Subject to operation mode, allowlist, and production guard policies.',
      inputSchema: createApplicationTool.inputSchema,
      annotations: createApplicationTool.annotations,
    },
    createApplicationTool.handler,
  );

  server.registerTool(
    'coolify_create_service',
    {
      description: 'Create a new service in a project environment. Requires safe-write operation mode.',
      inputSchema: createServiceTool.inputSchema,
      annotations: createServiceTool.annotations,
    },
    createServiceTool.handler,
  );

  server.registerTool(
    'coolify_create_database',
    {
      description: 'Create a new database in a project environment. Passwords and connection strings are NEVER returned in response. Requires safe-write operation mode.',
      inputSchema: createDatabaseTool.inputSchema,
      annotations: createDatabaseTool.annotations,
    },
    createDatabaseTool.handler,
  );

  server.registerTool(
    'coolify_set_environment_variables',
    {
      description: 'Set multiple environment variables on a resource in bulk (1-50). DEFAULT DISABLED — COOLIFY_ALLOW_ENV_WRITE must be true. Values are NEVER returned in response.',
      inputSchema: setEnvVarsBulkTool.inputSchema,
      annotations: setEnvVarsBulkTool.annotations,
    },
    setEnvVarsBulkTool.handler,
  );

  // ─── GitHub Discovery Tools ───
  server.registerTool(
    'coolify_list_github_apps',
    {
      description: 'List GitHub Apps connected to your Coolify instance. Returns team and system-wide apps.',
      inputSchema: githubAppsTool.inputSchema,
      annotations: githubAppsTool.annotations,
    },
    githubAppsTool.handler,
  );

  server.registerTool(
    'coolify_list_repositories',
    {
      description: 'List repositories accessible via a GitHub App. Supports pagination and search.',
      inputSchema: repositoriesTool.inputSchema,
      annotations: repositoriesTool.annotations,
    },
    repositoriesTool.handler,
  );

  server.registerTool(
    'coolify_list_branches',
    {
      description: 'List branches of a GitHub repository via a GitHub App.',
      inputSchema: branchesTool.inputSchema,
      annotations: branchesTool.annotations,
    },
    branchesTool.handler,
  );

  // ─── Scheduled Tasks Tools ───
  server.registerTool(
    'coolify_list_scheduled_tasks',
    {
      description: 'List scheduled tasks for an application or service.',
      inputSchema: scheduledTasksListTool.inputSchema,
      annotations: scheduledTasksListTool.annotations,
    },
    scheduledTasksListTool.handler,
  );

  server.registerTool(
    'coolify_get_task_executions',
    {
      description: 'Get execution history for a scheduled task. Output is redacted for security.',
      inputSchema: taskExecutionsTool.inputSchema,
      annotations: taskExecutionsTool.annotations,
    },
    taskExecutionsTool.handler,
  );

  server.registerTool(
    'coolify_create_scheduled_task',
    {
      description: 'Create a scheduled task (cron job) on an application or service. Subject to operation mode, allowlist, and production guard policies. Cron expression is validated.',
      inputSchema: createScheduledTaskTool.inputSchema,
      annotations: createScheduledTaskTool.annotations,
    },
    createScheduledTaskTool.handler,
  );

  server.registerTool(
    'coolify_update_scheduled_task',
    {
      description: 'Update a scheduled task. Subject to operation mode, allowlist, and production guard policies.',
      inputSchema: updateScheduledTaskTool.inputSchema,
      annotations: updateScheduledTaskTool.annotations,
    },
    updateScheduledTaskTool.handler,
  );
  server.registerTool(
    'coolify_execute_scheduled_task',
    {
      description: 'Execute a scheduled task immediately. Subject to operation mode, allowlist, and production guard policies.',
      inputSchema: executeScheduledTaskTool.inputSchema,
      annotations: executeScheduledTaskTool.annotations,
    },
    executeScheduledTaskTool.handler,
  );

  // ─── Deployment Tool ───
  server.registerTool(
    'coolify_cancel_deployment',
    {
      description: 'Cancel a queued or in-progress deployment. Returns UNSUPPORTED_OPERATION for terminal states. Audit: coolify.deployment.cancel.',
      inputSchema: cancelDeploymentTool.inputSchema,
      annotations: cancelDeploymentTool.annotations,
    },
    cancelDeploymentTool.handler,
  );

  // ─── Backup Tools ───
  server.registerTool(
    'coolify_list_database_backups',
    {
      description: 'List backup executions for a database. Sensitive destination paths are redacted.',
      inputSchema: listBackupsTool.inputSchema,
      annotations: listBackupsTool.annotations,
    },
    listBackupsTool.handler,
  );

  server.registerTool(
    'coolify_create_backup_config',
    {
      description: 'Create a backup configuration for a database. Cron expression is validated. Audit: coolify.database_backup_config.create',
      inputSchema: createBackupConfigTool.inputSchema,
      annotations: createBackupConfigTool.annotations,
    },
    createBackupConfigTool.handler,
  );
  server.registerTool(
    'coolify_list_backup_executions',
    {
      description: 'List backup executions for a scheduled backup configuration. Output is redacted for security.',
      inputSchema: backupExecutionsTool.inputSchema,
      annotations: backupExecutionsTool.annotations,
    },
    backupExecutionsTool.handler,
  );
  server.registerTool(
    'coolify_run_volume_backup',
    {
      description: 'Run a volume backup for a storage mount on an application, database, or service. Subject to operation mode, allowlist, and production guard policies.',
      inputSchema: runVolumeBackupTool.inputSchema,
      annotations: runVolumeBackupTool.annotations,
    },
    runVolumeBackupTool.handler,
  );
  server.registerTool(
    'coolify_update_backup_config',
    {
      description: 'Update a backup configuration for a database. PATCH semantics — only provided fields are updated. Cron expression is validated.',
      inputSchema: updateBackupConfigTool.inputSchema,
      annotations: updateBackupConfigTool.annotations,
    },
    updateBackupConfigTool.handler,
  );

  // ─── Server Tools ───
  server.registerTool(
    'coolify_list_servers',
    {
      description: 'List all servers connected to your Coolify instance. Sensitive network info and SSH keys are redacted.',
      inputSchema: listServersTool.inputSchema,
      annotations: listServersTool.annotations,
    },
    listServersTool.handler,
  );

  server.registerTool(
    'coolify_get_server',
    {
      description: 'Get a single server detail by UUID. SSH keys and sensitive network info are redacted.',
      inputSchema: getServerTool.inputSchema,
      annotations: getServerTool.annotations,
    },
    getServerTool.handler,
  );

  server.registerTool(
    'coolify_list_server_resources',
    {
      description: 'List resources associated with a specific server with optional type and status filters.',
      inputSchema: serverResourcesTool.inputSchema,
      annotations: serverResourcesTool.annotations,
    },
    serverResourcesTool.handler,
  );

  server.registerTool(
    'coolify_validate_server',
    {
      description: 'Validate server connectivity and configuration. Audited as a mutation action.',
      inputSchema: validateServerTool.inputSchema,
      annotations: validateServerTool.annotations,
    },
    validateServerTool.handler,
  );

  server.registerTool(
    'coolify_list_server_domains',
    {
      description: 'List domains associated with a server.',
      inputSchema: serverDomainsTool.inputSchema,
      annotations: serverDomainsTool.annotations,
    },
    serverDomainsTool.handler,
  );

  // ─── Team Tools ───
  server.registerTool(
    'coolify_get_current_team',
    {
      description: 'Get the current team context: id, name, and permission scope.',
      inputSchema: currentTeamTool.inputSchema,
      annotations: currentTeamTool.annotations,
    },
    currentTeamTool.handler,
  );

  server.registerTool(
    'coolify_list_team_members',
    {
      description: 'List members of the current team. Email addresses are policy-gated and redacted by default.',
      inputSchema: teamMembersTool.inputSchema,
      annotations: teamMembersTool.annotations,
    },
    teamMembersTool.handler,
  );

  // ─── Configuration Tools ───
  server.registerTool(
    'coolify_update_application_config',
    {
      description: 'Update application configuration: health check, resource limits, replicas, ports, build settings. PATCH semantics. Audit: coolify.application.config.update',
      inputSchema: updateAppConfigTool.inputSchema,
      annotations: updateAppConfigTool.annotations,
    },
    updateAppConfigTool.handler,
  );

  server.registerTool(
    'coolify_update_database_config',
    {
      description: 'Update database configuration: CPU/memory limits, name, description. PATCH semantics. Audit: coolify.database.config.update',
      inputSchema: updateDbConfigTool.inputSchema,
      annotations: updateDbConfigTool.annotations,
    },
    updateDbConfigTool.handler,
  );

  // ─── Storage Tools ───
  server.registerTool(
    'coolify_list_storages',
    {
      description: 'List storage mounts for an application, service, or database. Sensitive host paths are redacted.',
      inputSchema: listStoragesTool.inputSchema,
      annotations: listStoragesTool.annotations,
    },
    listStoragesTool.handler,
  );

  server.registerTool(
    'coolify_create_storage',
    {
      description: 'Create a storage mount for a resource. Path traversal is validated. Subject to operation mode, allowlist, and production guard policies. Audit: coolify.storage.create',
      inputSchema: createStorageTool.inputSchema,
      annotations: createStorageTool.annotations,
    },
    createStorageTool.handler,
  );

  server.registerTool(
    'coolify_create_s3_storage',
    {
      description: 'Create a new S3 storage configuration for the authenticated team. Credentials are never returned or logged. Subject to operation mode policy. Audit: coolify.s3_storage.create',
      inputSchema: createS3StorageTool.inputSchema,
      annotations: createS3StorageTool.annotations,
    },
    createS3StorageTool.handler,
  );

  server.registerTool(
    'coolify_validate_s3_storage',
    {
      description: 'Validate an S3 storage connection using ListObjectsV2. Audited as a mutation action.',
      inputSchema: validateS3StorageTool.inputSchema,
      annotations: validateS3StorageTool.annotations,
    },
    validateS3StorageTool.handler,
  );

  // ─── Notification Tools ───
  server.registerTool(
    'coolify_list_notifications',
    {
      description: 'List notification channel settings. Credential values (webhook URLs, tokens, passwords) are never exposed.',
      inputSchema: listNotificationsTool.inputSchema,
      annotations: listNotificationsTool.annotations,
    },
    listNotificationsTool.handler,
  );

  server.registerTool(
    'coolify_update_notification',
    {
      description: 'Update notification settings for a channel. PATCH semantics. Credential values are never echoed back or logged. Subject to operation mode and production guard policies. Audit: coolify.notification.update.',
      inputSchema: updateNotificationTool.inputSchema,
      annotations: updateNotificationTool.annotations,
    },
    updateNotificationTool.handler,
  );

  // ─── Destination Tools ───
  server.registerTool(
    'coolify_list_destinations',
    {
      description: 'List all Docker network destinations for the authenticated team.',
      inputSchema: listDestinationsTool.inputSchema,
      annotations: listDestinationsTool.annotations,
    },
    listDestinationsTool.handler,
  );

  server.registerTool(
    'coolify_get_destination',
    {
      description: 'Get a single destination by UUID.',
      inputSchema: getDestinationTool.inputSchema,
      annotations: getDestinationTool.annotations,
    },
    getDestinationTool.handler,
  );

  server.registerTool(
    'coolify_create_destination',
    {
      description: 'Create a Docker network destination on a server. Subject to operation mode, allowlist, and production guard policies. Audit: coolify.destination.create.',
      inputSchema: createDestinationTool.inputSchema,
      annotations: createDestinationTool.annotations,
    },
    createDestinationTool.handler,
  );

  // ─── Database & Service Logs ───
  server.registerTool(
    'coolify_get_database_logs',
    {
      description: 'Get database container logs. Secrets are redacted.',
      inputSchema: getDatabaseLogsTool.inputSchema,
      annotations: getDatabaseLogsTool.annotations,
    },
    getDatabaseLogsTool.handler,
  );

  server.registerTool(
    'coolify_get_service_logs',
    {
      description: 'Get service container logs. Secrets are redacted.',
      inputSchema: getServiceLogsTool.inputSchema,
      annotations: getServiceLogsTool.annotations,
    },
    getServiceLogsTool.handler,
  );

  // ─── Version Tool ───
  server.registerTool(
    'coolify_get_version',
    {
      description: 'Get the Coolify instance version.',
      inputSchema: getVersionTool.inputSchema,
      annotations: getVersionTool.annotations,
    },
    getVersionTool.handler,
  );

  return server;
}
