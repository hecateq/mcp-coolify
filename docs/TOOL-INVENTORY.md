# 🔧 Coolify MCP Server — Tool Inventory

> Created: 2026-08-12 | Source: Tool definitions visible through MCP protocol + actual tool calls

---

## 1. Tool List (42 tools)

> Note: `*` = required parameter. `[enum]` = possible values for action/status parameters.

### 📦 Deployments & Repo

| Tool | Parameters | Required |
|---|---|---|
| `deploy` | resource_uuid, resource_type `[application\|service\|database]`, force (bool), environment_name | ✓ uuid, type |
| `cancel_deployment` | deployment_uuid | ✓ |
| `list_deployments` | resource_uuid, status `[queued\|in_progress\|finished\|failed\|cancelled-by-user]`, limit | — |
| `get_deployment` | deployment_uuid | ✓ |
| `list_branches` | github_app_uuid, owner, repository | ✓ all |
| `list_github_apps` | — | — |
| `list_repositories` | github_app_uuid, search, page, limit | ✓ app uuid |

### 🖥️ Servers & Infrastructure

| Tool | Parameters | Required |
|---|---|---|
| `health` | — | — |
| `list_servers` | — | — |
| `get_server` | uuid | ✓ |
| `validate_server` | server_uuid | ✓ |
| `list_server_resources` | server_uuid, resource_type `[application\|service\|database]`, status | ✓ server |
| `list_server_domains` | server_uuid | ✓ |

### 📁 Projects & Environments

| Tool | Parameters | Required |
|---|---|---|
| `list_projects` | name (filter) | — |
| `get_project` | uuid | ✓ |
| `create_project` | name, description | ✓ name |
| `create_environment` | project_uuid, name | ✓ |
| `project_overview` | project_uuid | ✓ |

### 🚀 Applications

| Tool | Parameters | Required |
|---|---|---|
| `list_resources` | project_uuid, environment_uuid, resource_type `[application\|service\|database\|postgresql\|mysql\|redis\|mongodb]`, status `[running\|stopped\|degraded\|restarting\|exited]`, search | — |
| `get_resource` | uuid, type `[application\|service\|database]` | ✓ |
| `create_application` | project_uuid, environment_uuid, name, source_type `[public\|private-github-app\|private-deploy-key\|dockerfile\|dockerimage]`, repository_url, branch, build_pack, port (int), domains | ✓ project, env, name |
| `update_application_config` | application_uuid, name, description, fqdn, health_check (bool), cpu_limit, memory_limit, cpu_shares (2-1024), replicas (1-10), ports, build_pack, base_directory, dockerfile_location, auto_deploy (bool), previews (bool) | ✓ app uuid |
| `get_application_logs` | application_uuid, lines (10-1000) | ✓ app uuid |
| `start` / `stop` / `restart` | resource_uuid, resource_type, environment_name | ✓ |

### 🗄️ Databases

| Tool | Parameters | Required |
|---|---|---|
| `create_database` | project_uuid, environment_uuid, server_uuid, database_type `[postgresql\|mysql\|mongodb\|redis\|mariadb\|keydb\|dragonfly\|clickhouse]`, name, version | ✓ project, env, server, type, name |
| `update_database_config` | database_uuid, name, description, cpu_limit, memory_limit | ✓ db uuid |

### ⚙️ Services

| Tool | Parameters | Required |
|---|---|---|
| `create_service` | project_uuid, environment_uuid, server_uuid, name, service_type, docker_compose_raw | ✓ project, env, server, name |

### 🌿 Env Vars

| Tool | Parameters | Required |
|---|---|---|
| `list_environment_variables` | ⚠️ **no parameters** (appears to be a bug) | — |
| `set_environment_variable` | resource_uuid, key, value, environment_name | ✓ uuid, key, value |
| `set_environment_variables` | resource_uuid, resource_type, variables (1-50 entries of {key,value}), environment_name | ✓ uuid, type, variables |

### 💾 Backups

| Tool | Parameters | Required |
|---|---|---|
| `create_backup_config` | database_uuid, schedule (cron), destination_uuid, retention (1-365), enabled (bool) | ✓ db, schedule |
| `list_database_backups` | database_uuid | ✓ |

### 👥 Teams

| Tool | Parameters | Required |
|---|---|---|
| `get_current_team` | — | — |
| `list_team_members` | — | — |

### 🔁 Scheduled Tasks & Storage

| Tool | Parameters | Required |
|---|---|---|
| `create_scheduled_task` | resource_uuid, resource_type `[application\|service]`, name, command, schedule (cron), container, timeout (≤86400s), enabled | ✓ uuid, type, name, command, schedule |
| `update_scheduled_task` | task_uuid, resource_uuid, resource_type, name, command, schedule, container, timeout, enabled | ✓ task, uuid, type |
| `get_task_executions` | task_uuid, resource_uuid, resource_type, status `[running\|completed\|failed\|cancelled]`, limit | ✓ task, uuid |
| `list_scheduled_tasks` | resource_uuid, resource_type | ✓ uuid |
| `create_storage` | resource_uuid, resource_type `[application\|service\|database]`, storage_type `[volume\|bind\|cifs\|nfs]`, source, destination, name | ✓ uuid, type, source, dest |
| `list_storages` | resource_uuid, resource_type | ✓ |

---

## 2. Categorized Summary

| Category | Tool Count | Read | Write |
|---|---|---|---|
| Infrastructure/Servers | 6 | 5 | 1 (validate) |
| Projects/Environments | 5 | 3 | 2 |
| Applications | 9 | 3 | 6 |
| Databases | 2 | 0 (read → via get_resource) | 2 |
| Services | 1 | 0 | 1 |
| Deployments/Repo | 7 | 6 | 1 |
| Env Vars | 3 | 1 | 2 |
| Backups | 2 | 1 | 1 |
| Teams | 2 | 2 | 0 |
| Tasks/Storage | 6 | 3 | 3 |

---

## 3. Scope Test

| Operation | Status | Description |
|---|---|---|
| **Container exec** (exec into container and run commands) | ❌ **NO** | No exec-like tool exists |
| **CPU/memory limit** | ✅ **YES** | `update_application_config` (cpu_limit, memory_limit, cpu_shares) + `update_database_config` |
| **Docker prune / disk cleanup** | ❌ **NO** | None |
| **Notification channel** (Slack/Discord/email) | ❌ **NO** | None |
| **Domain/SSL/proxy config** | ⚠️ **PARTIAL** | `fqdn` + `ports` can be changed; SSL certificate/HTTPS management **none**; `list_server_domains` read-only |
| **Metrics / resource history** | ❌ **NO** | No metrics tool exists — only instant status string (`running:healthy`), no charts/history possible |
| **Team invite / role assignment** | ⚠️ **LISTING ONLY** | `list_team_members` exists; invite, delete, role assignment **none** |
| **Backup destination (S3) configuration** | ⚠️ **PARTIAL** | `create_backup_config` accepts `destination_uuid` but no destination (S3 storage) **create/manage tool exists** |
| **Batch operation** | ❌ **NO** | All single-resource based; no bulk deploy/update |
| **Webhook management** | ❌ **NO** | None |

---

## 4. Actual Call Test — `project_overview`

`get_infrastructure_overview` tool does **not exist**; closest equivalent is `project_overview`. Actual response:

```json
{
  "ok": true,
  "summary": "Overview for project \"Kozmira\": 0 resources, 0 running",
  "data": {
    "project": { "uuid": "rg04ow8cockwgg04wwkks0w0", "name": "Kozmira" },
    "environments": [
      { "uuid": "rks44co0owg4k4g4c44wcgss", "name": "production" }
    ],
    "resources": [],
    "recentDeployments": [],
    "summary": { "totalResources": 0, "running": 0, "stopped": 0, "degraded": 0 }
  },
  "meta": {}
}
```

**Response shape findings:**

- Standard format: `{ok, summary, data, meta}` — clean and consistent
- **Very summary-level**: `get_resource` bile sadece `uuid/name/status` returned — no domain, port, image, env info
- **Sensitive fields redacted**: env values, SSH keys, server IPs never returned for security reasons
- `list_resources` 54 returned resources (name, type, status) — `project_overview`'daki `resources` array'i ise appears empty (filtering behavior may be inconsistent)
- Status format: `"running:healthy"`, `"exited:unhealthy"` compound strings like

---

## 5. Conclusion

### 🟥 Critical Gaps

1. **Container exec** — most important operational capability for debugging
2. **Metrics/history** — resource usage, CPU/RAM history, chart data (not even instant, only health status)
3. **Notification channel management** — Slack/Discord/email add/change Slack/Discord/email channels
4. **Webhook management** — required for automation/integration
5. **Backup destination configuration** — backup config loses meaning without creating S3 etc. destinations

### 🟨 Nice to Have

1. **Docker prune / disk cleanup** — needed on long-running servers
2. **SSL certificate management** — renew, force HTTPS, check cert status
3. **Batch operations** — bulk deploy/stop/restart across multiple apps
4. **Team write operations** — invite, change roles, remove members
5. **Detailed resource view** — `get_resource`'un extended version of `get_resource` with fqdn/port/image/domain

### 🟩 May Not Be Needed

1. **Storage snapshot/restore** — not in Coolify API, not expected from MCP either
2. **Instant resource usage (live stats)** — `docker stats` -like data not available from API, requires separate server access

---

## Overall Assessment

CRUD-focused, clean and consistent MCP server. Lifecycle management (deploy/start/stop/restart/config) well covered; but **operational depth is weak** (no exec, metrics, notification, webhook).

**Known inconsistencies:**
- `list_environment_variables has no resource parameter at all
- `project_overview's resources array comes back empty

These appear to be bugs in the MCP server itself.
