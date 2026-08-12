# Coolify API Capability Matrix

Maps Coolify API resources and operations to MCP tools, classified by read/write/deploy access and implementation status.

**Current coverage: ~62% (42 tools covering ~68 endpoints)**

---

## Legend

| Column | Description |
|--------|-------------|
| **MCP Tool** | Tool name in this MCP server (blank = not implemented) |
| **Coolify Resource Type** | Coolify API resource/domain |
| **Coolify API Operation** | HTTP method and path used |
| **Required Permission** | Token permission needed |
| **R/W/D** | Classification: **R**ead / **W**rite / **D**eploy |
| **Sensitive Data?** | Response contains secrets (tokens, passwords, URLs) |
| **Implemented?** | ✅ Fully implemented / ⚠️ Partial / ❌ Not implemented |

---

## Read Capabilities

### Health & Connectivity

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| `coolify_health` | Health | `GET /api/v1/health` | `read` (via COOLIFY_READ_TOKEN) | R | ❌ | ✅ |
| — | Health | `GET /api/v1/health` | none (public) | R | ❌ | ⚠️ (via MCP server's `/healthz`) |

### Projects

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| `coolify_list_projects` | Projects | `GET /api/v1/projects` | `read` | R | ❌ | ✅ |
| `coolify_get_project` | Project | `GET /api/v1/projects/{uuid}` | `read` | R | ❌ | ✅ |
| `coolify_get_project` | Project Environments | `GET /api/v1/projects/{uuid}/environments` | `read` | R | ❌ | ✅ |
| `coolify_project_overview` | Project (aggregated) | Aggregates 4 API calls | `read` | R | ❌ | ✅ |
| — | Project | `POST /api/v1/projects` | `write` | W | ❌ | ✅ (`coolify_create_project`) |
| — | Project | `PATCH /api/v1/projects/{uuid}` | `write` | W | ❌ | ❌ |
| — | Project | `DELETE /api/v1/projects/{uuid}` | `write` | W | ❌ | ❌ |

### Environments

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| — | Environments | `POST /api/v1/projects/{uuid}/environments` | `write` | W | ❌ | ✅ (`coolify_create_environment`) |
| — | Environment | `DELETE /api/v1/projects/{uuid}/environments/{uuid}` | `write` | W | ❌ | ❌ |

### Resources

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| `coolify_list_resources` | Resources | `GET /api/v1/resources` | `read` | R | ❌ | ✅ |
| `coolify_get_resource` | Application Detail | `GET /api/v1/applications/{uuid}` | `read` (via COOLIFY_READ_TOKEN) | R | ⚠️ (DB URLs redacted) | ✅ |
| `coolify_get_resource` | Service Detail | `GET /api/v1/services/{uuid}` | `read` | R | ⚠️ | ✅ |
| `coolify_get_resource` | Database Detail | `GET /api/v1/databases/{uuid}` | `read` | R | ⚠️ (DB URLs redacted) | ✅ |
| — | Resource tags | `GET /api/v1/resources/tags` | `read` | R | ❌ | ❌ |
| — | Resource | `POST /api/v1/applications` | `write` | W | ❌ | ✅ (`coolify_create_application`) |
| — | Resource | `POST /api/v1/services` | `write` | W | ❌ | ✅ (`coolify_create_service`) |
| — | Resource | `POST /api/v1/databases` | `write` | W | ❌ | ✅ (`coolify_create_database`) |
| — | Resource | `DELETE /api/v1/resources/{uuid}` | `write` | W | ❌ | ❌ |

### Applications (specific)

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| — | Application | `GET /api/v1/applications` | `read` | R | ❌ | ❌ (covered by list_resources) |
| — | Application Envs | `GET /api/v1/applications/{uuid}/envs` | `sensitive` | R | ✅ (values redacted) | ✅ (via `coolify_list_environment_variables`) |
| — | Application Env | `GET /api/v1/applications/{uuid}/envs/{uuid}` | `sensitive` | R | ✅ | ❌ |
| `coolify_get_application_logs` | Application Logs | `GET /api/v1/applications/{uuid}/logs` | `sensitive` | R | ⚠️ (secrets redacted) | ✅ |
| — | Application Configuration | `GET /api/v1/applications/{uuid}/configuration` | `read` | R | ⚠️ | ❌ |
| — | Application Deployment Queue | `GET /api/v1/applications/{uuid}/deployment-queue` | `read` | R | ❌ | ❌ |
| `coolify_update_application_config` | Application Config | `PATCH /api/v1/applications/{uuid}` | `write` | W | ❌ | ✅ |

### Services (specific)

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| — | Service | `GET /api/v1/services` | `read` | R | ❌ | ❌ (covered by list_resources) |
| — | Service Logs | `GET /api/v1/services/{uuid}/logs` | `sensitive` | R | ⚠️ | ❌ |
| — | Service Envs | `GET /api/v1/services/{uuid}/envs` | `sensitive` | R | ✅ | ❌ |

### Databases (specific)

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| — | Database | `GET /api/v1/databases` | `read` | R | ❌ | ❌ (covered by list_resources) |
| — | Database Logs | `GET /api/v1/databases/{uuid}/logs` | `sensitive` | R | ⚠️ | ❌ |
| — | Database Envs | `GET /api/v1/databases/{uuid}/envs` | `sensitive` | R | ✅ | ❌ |
| `coolify_update_database_config` | Database Config | `PATCH /api/v1/databases/{uuid}` | `write` | W | ❌ | ✅ |

### Database Backups

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| `coolify_list_database_backups` | Database Backups | `GET /api/v1/databases/{uuid}/backups` | `read` | R | ⚠️ (paths redacted) | ✅ |
| `coolify_create_backup_config` | Database Backup Config | `POST /api/v1/databases/{uuid}/backups` | `write` | W | ❌ | ✅ |

### Deployments

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| `coolify_list_deployments` | Deployments | `GET /api/v1/deployments` | `read` | R | ❌ | ✅ |
| `coolify_get_deployment` | Deployment Detail | `GET /api/v1/deployments/{uuid}` | `read` | R | ❌ | ✅ |

### GitHub Discovery

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| `coolify_list_github_apps` | GitHub Apps | `GET /api/v1/github-apps` | `read` | R | ❌ | ✅ |
| `coolify_list_repositories` | GitHub Repositories | `GET /api/v1/github-apps/{uuid}/repositories` | `read` | R | ❌ | ✅ |
| `coolify_list_branches` | GitHub Branches | `GET /api/v1/github-apps/{uuid}/repositories/{owner}/{repo}/branches` | `read` | R | ❌ | ✅ |

### Scheduled Tasks

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| `coolify_list_scheduled_tasks` | Scheduled Tasks | `GET /api/v1/applications/{uuid}/scheduled-tasks` | `read` | R | ❌ | ✅ |
| `coolify_get_task_executions` | Task Executions | `GET /api/v1/scheduled-tasks/{uuid}/executions` | `read` | R | ⚠️ (output redacted) | ✅ |

### Servers

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| `coolify_list_servers` | Servers | `GET /api/v1/servers` | `read` | R | ⚠️ (network info redacted) | ✅ |
| `coolify_get_server` | Server Detail | `GET /api/v1/servers/{uuid}` | `read` | R | ⚠️ (SSH keys redacted) | ✅ |
| `coolify_list_server_resources` | Server Resources | `GET /api/v1/servers/{uuid}/resources` | `read` | R | ❌ | ✅ |
| `coolify_list_server_domains` | Server Domains | `GET /api/v1/servers/{uuid}/domains` | `read` | R | ❌ | ✅ |

### Teams

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| `coolify_get_current_team` | Current Team | `GET /api/v1/teams/current` | `read` | R | ❌ | ✅ |
| `coolify_list_team_members` | Team Members | `GET /api/v1/teams/current/members` | `read` | R | ⚠️ (email policy-gated) | ✅ |
| — | Team Invitations | `GET /api/v1/teams/invitations` | `read` | R | ❌ | ❌ |

### Storage

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| `coolify_list_storages` | Storage Mounts | `GET /api/v1/applications/{uuid}/storages` | `read` | R | ⚠️ (host paths redacted) | ✅ |

### API Tokens (Not Implemented)

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| — | API Tokens | `GET /api/v1/tokens` | `read` | R | ✅ | ❌ |
| — | API Token Detail | `GET /api/v1/tokens/{uuid}` | `read` | R | ✅ | ❌ |

### Other (Not Implemented)

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| — | Private Keys | `GET /api/v1/private-keys` | `read` | R | ✅ | ❌ |
| — | Destinations | `GET /api/v1/destinations` | `read` | R | ❌ | ❌ |
| — | Destination Detail | `GET /api/v1/destinations/{uuid}` | `read` | R | ❌ | ❌ |
| — | Shared Environment Variables | `GET /api/v1/shared-variables` | `read` | R | ✅ | ❌ |
| — | Projects With Resources | `GET /api/v1/projects-with-resources` | `read` | R | ❌ | ❌ |
| — | Resource Metrics | `GET /api/v1/resources/{uuid}/metrics` | `read` | R | ❌ | ❌ **— NOT IMPLEMENTED — NO VERIFIED OFFICIAL API** |

---

## Write Capabilities (Mutations)

### Application Lifecycle

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| `coolify_deploy` | Deploy Resource | `GET /api/v1/deploy?uuid=...` (force: `POST`) | `deploy` | D | ❌ | ✅ |
| `coolify_deploy` (force) | Deploy Resource | `POST /api/v1/deploy?uuid=...&type=...` | `deploy` | D | ❌ | ✅ |
| `coolify_restart` | Application | `POST /api/v1/applications/{uuid}/restart` | `deploy` | D | ❌ | ✅ |
| `coolify_start` | Application | `POST /api/v1/applications/{uuid}/start` | `deploy` | D | ❌ | ✅ |
| `coolify_stop` | Application | `POST /api/v1/applications/{uuid}/stop` | `write` | W | ❌ | ✅ (gated by ALLOW_STOP) |
| `coolify_cancel_deployment` | Deployment | `POST /api/v1/deployments/{uuid}/cancel` | `deploy` | D | ❌ | ✅ |
| — | Resource Rollback | `POST /api/v1/deployments/{uuid}/rollback` | `deploy` | D | ❌ | ❌ |
| — | Tag Deploy | `POST /api/v1/deploy?uuid=...&tag=...` | `deploy` | D | ❌ | ❌ |
| — | Application | `POST /api/v1/applications` | `write` | W | ❌ | ✅ (`coolify_create_application`) |
| — | Application | `DELETE /api/v1/applications/{uuid}` | `write` | W | ❌ | ❌ |
| — | Service | `POST /api/v1/services/{uuid}/start` | `deploy` | D | ❌ | ❌ |
| — | Service | `POST /api/v1/services/{uuid}/stop` | `write` | W | ❌ | ❌ |
| — | Service | `POST /api/v1/services/{uuid}/restart` | `deploy` | D | ❌ | ❌ |
| — | Database | `POST /api/v1/databases/{uuid}/start` | `deploy` | D | ❌ | ❌ |
| — | Database | `POST /api/v1/databases/{uuid}/stop` | `write` | W | ❌ | ❌ |
| — | Database | `POST /api/v1/databases/{uuid}/restart` | `deploy` | D | ❌ | ❌ |

### Environment Variable Operations

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| `coolify_set_environment_variable` | Application Envs | `PATCH /api/v1/applications/{uuid}/envs/bulk` | `write` | W | ✅ (value received but NEVER returned) | ✅ (gated by ALLOW_ENV_WRITE) |
| `coolify_set_environment_variables` | Application Envs (bulk) | `PATCH /api/v1/applications/{uuid}/envs/bulk` | `write` | W | ✅ (values NEVER returned) | ✅ (gated by ALLOW_ENV_WRITE) |
| — | Application Env | `POST /api/v1/applications/{uuid}/envs` | `write` | W | ✅ | ❌ |
| — | Service Envs Bulk | `PATCH /api/v1/services/{uuid}/envs/bulk` | `write` | W | ✅ | ❌ |
| — | Database Envs Bulk | `PATCH /api/v1/databases/{uuid}/envs/bulk` | `write` | W | ✅ | ❌ |
| — | Env Variable | `DELETE /api/v1/applications/{uuid}/envs/{env_uuid}` | `write` | W | ❌ | ❌ |

### Scheduled Task Operations

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| `coolify_create_scheduled_task` | Scheduled Tasks | `POST /api/v1/applications/{uuid}/scheduled-tasks` | `write` | W | ❌ | ✅ (cron validated) |
| `coolify_update_scheduled_task` | Scheduled Tasks | `PATCH /api/v1/scheduled-tasks/{uuid}` | `write` | W | ❌ | ✅ |
| — | Scheduled Task | `DELETE /api/v1/scheduled-tasks/{uuid}` | `write` | W | ❌ | ❌ |

### Server Operations

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| `coolify_validate_server` | Server | `POST /api/v1/servers/{uuid}/validate` | `write` (audited) | W | ❌ | ✅ |
| — | Server | `POST /api/v1/servers` | `write` | W | ✅ | ❌ |
| — | Server | `PATCH /api/v1/servers/{uuid}` | `write` | W | ✅ | ❌ |
| — | Server | `DELETE /api/v1/servers/{uuid}` | `write` | W | ✅ | ❌ |

### Storage Operations

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| `coolify_create_storage` | Storage Mounts | `POST /api/v1/applications/{uuid}/storages` | `write` | W | ❌ | ✅ (path traversal validated) |

### Project/Resource Creation

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| `coolify_create_project` | Project | `POST /api/v1/projects` | `write` | W | ❌ | ✅ |
| `coolify_create_environment` | Environment | `POST /api/v1/projects/{uuid}/environments` | `write` | W | ❌ | ✅ |
| `coolify_create_application` | Application | `POST /api/v1/applications` | `write` | W | ❌ | ✅ |
| `coolify_create_service` | Service | `POST /api/v1/services` | `write` | W | ❌ | ✅ |
| `coolify_create_database` | Database | `POST /api/v1/databases` | `write` | W | ⚠️ (passwords NEVER returned) | ✅ |

### Not Implemented Write Operations

| MCP Tool | Coolify Resource Type | Coolify API Operation | Required Permission | R/W/D | Sensitive Data? | Implemented? |
|----------|----------------------|-----------------------|---------------------|:-----:|:---------------:|:------------:|
| — | API Token | `POST /api/v1/tokens` | `write` | W | ✅ | ❌ |
| — | API Token | `DELETE /api/v1/tokens/{uuid}` | `write` | W | ✅ | ❌ |
| — | Private Key | `POST /api/v1/private-keys` | `write` | W | ✅ | ❌ |
| — | Private Key | `DELETE /api/v1/private-keys/{uuid}` | `write` | W | ✅ | ❌ |
| — | Destination | `POST /api/v1/destinations` | `write` | W | ❌ | ❌ |
| — | Shared Variable | `POST /api/v1/shared-variables` | `write` | W | ✅ | ❌ |
| — | Team | `POST /api/v1/teams` | `write` | W | ❌ | ❌ |
| — | Team Member | `POST /api/v1/teams/{uuid}/members` | `write` | W | ❌ | ❌ |
| — | Team Invitation | `POST /api/v1/teams/invitations` | `write` | W | ❌ | ❌ |
| — | Application | `DELETE /api/v1/applications/{uuid}` | `write` | W | ❌ | ❌ |
| — | Service | `DELETE /api/v1/services/{uuid}` | `write` | W | ❌ | ❌ |
| — | Database | `DELETE /api/v1/databases/{uuid}` | `write` | W | ❌ | ❌ |
| — | Project | `DELETE /api/v1/projects/{uuid}` | `write` | W | ❌ | ❌ |

---

## Summary

| Capability Category | Total Endpoints | MCP Tools | Coverage |
|-------------------|:---------------:|:---------:|:--------:|
| **Read — Projects & Resources** | ~12 | 10 | ✅ Near-full |
| **Read — Deployments** | 2 | 2 | ✅ Full |
| **Read — Logs & Env Vars** | ~6 | 2 | ⚠️ Partial (apps only) |
| **Read — GitHub Discovery** | 3 | 3 | ✅ Full |
| **Read — Scheduled Tasks** | 2 | 2 | ✅ Full |
| **Read — Infra (Servers, Teams, Storage)** | ~8 | 7 | ✅ Majority |
| **Write — Application Lifecycle** | ~12 | 10 | ✅ Majority |
| **Write — Env Vars** | ~5 | 2 | ⚠️ Partial (apps only) |
| **Write — Scheduled Tasks** | 3 | 2 | ⚠️ Partial (no delete) |
| **Write — Resource Creation** | 5 | 5 | ✅ Full |
| **Write — Storage** | 1 | 1 | ✅ |
| **Write — Infrastructure** | ~10 | 1 | ❌ Minimal (validate only) |
| **Write — Admin (Tokens, Keys, Teams)** | ~10 | 0 | ❌ None |
| **Total** | **~68** | **42** | **~62%** |

---

## Tool Count by Category

| Category | Count | Category | Count |
|----------|:-----:|----------|:-----:|
| Read (Phase 1) | 10 | GitHub Discovery | 3 |
| Action (Phase 1 original) | 5 | Scheduled Tasks | 4 |
| New Action (Phase 2) | 6 | Servers | 5 |
| Deployments | 1 | Teams | 2 |
| Backups | 2 | Configuration | 2 |
| | | Storage | 2 |
| | | **Total** | **42** |

---

## Design Rationale for Exclusions

The following Coolify API capabilities are **intentionally excluded** from this MCP server:

### 1. Server Creation/Deletion

**Why excluded:** Infrastructure-level operations that configure the Coolify host itself. Allowing an AI agent to add/remove servers could enable privilege escalation beyond the Coolify application layer. Server **read** operations are now exposed (Phase 2), but mutations are excluded.

- `POST /api/v1/servers` — Adding new servers
- `DELETE /api/v1/servers/{uuid}` — Removing servers
- `PATCH /api/v1/servers/{uuid}` — Updating server configuration

### 2. Admin Operations (API Tokens, Teams, Invitations)

**Why excluded:** Token management and team membership control the Coolify security model itself. Granting AI agents the ability to create new tokens or invite users would undermine the security controls this MCP server provides. Team **read** operations are now exposed (Phase 2).

- `POST /api/v1/tokens` — Creating new API tokens
- `DELETE /api/v1/tokens/{uuid}` — Deleting API tokens
- `POST /api/v1/teams` — Creating teams
- `POST /api/v1/teams/{uuid}/members` — Adding team members

### 3. Resource Deletion

**Why excluded:** Deleting entire resources (applications, services, databases) is high-impact and irreversible. Resource **creation** is now exposed (Phase 2) with policy enforcement, but deletion remains excluded.

- `DELETE /api/v1/applications/{uuid}` — Deleting applications
- `DELETE /api/v1/services/{uuid}` — Deleting services
- `DELETE /api/v1/databases/{uuid}` — Deleting databases
- `DELETE /api/v1/projects/{uuid}` — Deleting projects

### 4. Service/Database Logs and Envs

**Why excluded:** These endpoints exist in the Coolify API but are not yet implemented. They follow the same patterns as their application counterparts and can be added when needed.

- `GET /api/v1/services/{uuid}/logs` — Service logs
- `PATCH /api/v1/services/{uuid}/envs/bulk` — Service env vars
- `PATCH /api/v1/databases/{uuid}/envs/bulk` — Database env vars

### 5. Resource Metrics

**Why excluded:** `coolify_get_resource_metrics` is not implemented because there is no verified official Coolify REST API endpoint. Metrics are only available via Livewire/Sentinel (web-only internal UI).

### 6. Private Keys, Destinations, Shared Variables

**Why excluded:** These represent infrastructure credentials and cross-cutting configuration. Private keys (SSH) and destinations (S3, Docker networks) should remain manually configured.

### 7. Tag-Based Deploy

**Why excluded:** Tag-based deployment (`POST /api/v1/deploy?uuid=...&tag=...`) is a specialized operation with different semantics. May be added in a future phase.
