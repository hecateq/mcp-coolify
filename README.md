# Coolify MCP Server

A production-grade MCP (Model Context Protocol) server that provides AI agents with secure, controlled access to Coolify infrastructure management.

[![npm version](https://img.shields.io/badge/version-1.0.0-blue)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## Table of Contents

1. [Why This MCP Exists](#-why-this-mcp-exists)
2. [Architecture](#-architecture)
3. [Security Model](#-security-model)
4. [Coolify API Permissions](#-coolify-api-permissions)
5. [Quick Start](#-quick-start)
6. [Environment Variables](#-environment-variables)
7. [Local stdio Usage](#-local-stdio-usage-opencode)
8. [🤖 LLM Install Prompt](#-llm-install-prompt-copy-paste-this-into-any-ai-assistant)
9. [Remote HTTP Usage](#-remote-http-usage-opencode)
10. [Tool Catalog](#-tool-catalog)
11. [Operation Modes](#-operation-modes)
12. [Production Safeguards](#-production-safeguards)
13. [Docker Usage](#-docker-usage)
14. [Troubleshooting](#-troubleshooting)
15. [Development](#-development)

---

## Why This MCP Exists

Coolify ships its own MCP integration that exposes raw Coolify API resources directly to AI agents. While powerful, that MCP operates as a transparent pass-through to the API, with minimal guardrails between the agent and your production infrastructure.

**This MCP is different.** It adds a security and policy enforcement layer between the AI agent and Coolify:

| Aspect | Coolify Built-in MCP | This MCP Server |
|--------|---------------------|-----------------|
| **Security Model** | Direct API token passthrough | Least-privilege token selection, scoped by operation |
| **Operation Modes** | None | `read-only`, `deploy-only`, `safe-write` |
| **Access Control** | Coolify-native RBAC only | Allowlists by project, environment, and resource UUID |
| **Production Guard** | None | Blocks mutations on production environments by default |
| **Audit Trail** | Minimal | Structured audit events for every mutation (allowed/denied/error) |
| **Secret Redaction** | None | Automatic redaction of tokens, passwords, DB URLs, logs, SSH keys, email addresses |
| **Rate/Scope** | Full API surface | **42 curated tools** grouped into 10 domains: core, GitHub discovery, scheduled tasks, deployments, backups, servers, teams, configuration, storage, and environment variables |

This MCP is designed for **operational control** — letting AI safely observe, deploy, and manage Coolify resources without risking accidental production damage.

---

## Architecture

```
 ┌──────────────┐     MCP Protocol      ┌──────────────────────────────────────────────────┐
 │              │  (stdio or HTTP SSE)   │                                                  │
 │  AI Agent    │◄──────────────────────►│              Coolify MCP Server                  │
 │  (Claude,    │                        │                                                  │
 │   Copilot,   │     Tool Calls         │  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
 │   Cursor,    │◄──────────────────────►│  │  Auth &  │─►│ Policy & │─►│   Scope      │    │
 │   OpenCode)  │     JSON Responses     │  │ Token    │  │ Operation│  │  Allowlist   │    │
 │              │                        │  │ Selector │  │ Mode     │  │              │    │
 └──────────────┘                        │  └──────────┘  └────┬─────┘  └──────┬───────┘    │
                                         │                      │               │            │
                                         │  ┌───────────────────▼───────────────▼────────┐  │
                                         │  │           Production Guard                │  │
                                         │  │  (Deny/allow production mutations)        │  │
                                         │  └───────────────────┬────────────────────────┘  │
                                         │                      │                           │
                                         │  ┌───────────────────▼────────────────────────┐  │
                                         │  │  Tool Domains (42 tools across 10 areas)  │  │
                                         │  │                                            │  │
                                         │  │  Core Read (10)   │  GitHub Discovery (3)  │  │
                                         │  │  Actions (11)     │  Scheduled Tasks (4)   │  │
                                         │  │  Servers (5)      │  Backups (2)           │  │
                                         │  │  Teams (2)        │  Configuration (2)     │  │
                                         │  │  Storage (2)      │  Deployments (1)       │  │
                                         │  └───────────────────┬────────────────────────┘  │
                                         │                      │                           │
                                         │  ┌───────────────────▼────────────────────────┐  │
                                         │  │        Coolify API Client                  │  │
                                         │  │  (Token-scoped HTTP requests, redaction)   │  │
                                         │  └───────────────────┬────────────────────────┘  │
                                         │                      │                           │
                                         └──────────────────────┼───────────────────────────┘
                                                                │
                                                       HTTPS (Bearer Token)
                                                                │
                                         ┌──────────────────────▼──────────────────────────┐
                                         │              Coolify Instance                    │
                                         │  (Projects, Resources, Deployments, Envs,       │
                                         │   Servers, Teams, GitHub Apps, Backups,         │
                                         │   Scheduled Tasks, Storage Mounts)              │
                                         └─────────────────────────────────────────────────┘
```

---

## Security Model

### Least-Privilege Tokens

Instead of a single master token, you can configure up to **5 scoped tokens**:

| Token Env Var | Used For | Example Coolify Token Scopes |
|--------------|----------|------------------------------|
| `COOLIFY_READ_TOKEN` | All read operations (list/get resources) | `view:projects`, `view:resources` |
| `COOLIFY_SENSITIVE_TOKEN` | Reading sensitive data (env vars, logs) | `view:envs`, `view:logs` |
| `COOLIFY_WRITE_TOKEN` | Write operations (set env vars) | `edit:envs` |
| `COOLIFY_DEPLOY_TOKEN` | Deploy/start/restart operations | `deploy:applications` |
| `COOLIFY_API_TOKEN` | Fallback when no scoped token matches | `*` (full access) |

The server selects the **minimum-privilege token** for each operation. If `COOLIFY_READ_TOKEN` is set, list-projects uses it, never the master token.

### Secret Redaction

- Environment variable **values are NEVER returned** by `coolify_list_environment_variables` — only keys and metadata.
- Logs are scanned for `Bearer` tokens, `password`, `secret`, `api_key` patterns and automatically redacted.
- The Pino logger has built-in redaction paths for sensitive fields.
- Audit events do not contain secret values.

### Phase 2 Security Controls

With the addition of 21 new tools in Phase 2, the following security controls were added:

#### Scheduled Task Command Redaction
- Task command output in `coolify_get_task_executions` is redacted to prevent command injection visibility.
- Cron expressions are validated server-side before creation/update.

#### Path Traversal Prevention (Storage)
- `coolify_create_storage` validates `source` and `destination` paths against directory traversal patterns (`../`, `..\\`, absolute paths).
- If a path contains traversal sequences, the operation is denied with a `VALIDATION_ERROR`.

#### Field Allowlisting (Configuration Updates)
- `coolify_update_application_config` and `coolify_update_database_config` use PATCH semantics with explicit field allowlisting.
- Only documented fields can be updated. Arbitrary field injection is blocked.
- Each update is audited with `coolify.application.config.update` / `coolify.database.config.update` events.

#### Email/SSH Key Redaction
- `coolify_list_team_members` gates email addresses behind policy. By default, `[REDACTED]` is returned.
- `coolify_get_server` redacts SSH private keys and sensitive connection details.
- `coolify_list_servers` redacts network information (IP addresses, ports).

#### GitHub Discovery Security
- `coolify_list_github_apps` returns no secrets — only UUID, name, organization, and installation metadata.
- Repository browsing is scoped to what the configured GitHub App can access.
- All GitHub discovery tools are read-only with no mutation capabilities.

#### Database Password Protection
- `coolify_create_database` never returns generated passwords or connection strings in its response.
- `coolify_list_database_backups` redacts destination storage paths.

### Additional Protections

- **Timing-safe API key comparison** for HTTP transport auth (prevents timing attacks).
- **Scope checking** via allowlists before any operation touches a resource.
- **Production guard** runs before any mutation.

---

## Coolify API Permissions

The relationship between the Coolify API token permissions and this MCP's tool categories:

| Permission Class | Required Coolify Token Scope | MCP Tools |
|-----------------|------------------------------|-----------|
| **Read** | `view:projects`, `view:resources`, `view:deployments`, `view:servers`, `view:teams` | All 25 read tools (core + discovery + servers + teams + storage) |
| **Sensitive Read** | `view:envs`, `view:logs` | `coolify_get_application_logs`, `coolify_list_environment_variables`, `coolify_get_server`, `coolify_get_task_executions` |
| **Deploy** | `deploy:applications` | `coolify_deploy`, `coolify_restart`, `coolify_start`, `coolify_cancel_deployment` |
| **Write** | `edit:envs`, `operate:applications`, `operate:servers` | All safe-write tools (create project/env/app/service/db, set env vars, create scheduled tasks, create backups, create storage, update configs, validate server) |
| **Stop** | `operate:applications` | `coolify_stop` (gated by `COOLIFY_ALLOW_STOP`) |

---

## Quick Start

### Prerequisites

- Node.js >= 18
- A Coolify instance with API tokens configured
- Coolify API token(s) with appropriate scopes

### Option A — Install from npm (recommended)
```bash
npm install -g @imhecateq/mcp-coolify
# Or run it on the fly
npx -y @imhecateq/mcp-coolify
```

### Option B — Install from GitHub
```bash
git clone https://github.com/hecateq/mcp-coolify.git
cd mcp-coolify
npm install
npm run build
```


Then configure your MCP client (see [Local stdio Usage](#-local-stdio-usage-opencode)) with:

```jsonc
{
  "type": "local",
  "command": ["node", "node_modules/@imhecateq/mcp-coolify/dist/index.js"],
  "environment": { "COOLIFY_URL": "...", "COOLIFY_API_TOKEN": "..." }
}
```

### Option C — Clone and run locally

```bash
# 1. Clone the repository
git clone https://github.com/hecateq/mcp-coolify.git
cd mcp-coolify

# 2. Install dependencies (prepares dist/ automatically)
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your Coolify URL and API token

# 4. Run the server (stdio mode — default)
npm start
```

### Test the connection

The server exposes a health tool. In stdio mode, use an MCP client to query:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "coolify_health",
    "arguments": {}
  }
}
```

Expected response:
```json
{
  "content": [{
    "text": "{\n  \"ok\": true,\n  \"coolifyUrl\": \"[CONFIGURED]\",\n  \"authStatus\": \"authenticated\",\n  \"latencyMs\": 42,\n  \"transport\": \"stdio\"\n}"
  }]
}
```

---


---

## 🤖 LLM Install Prompt (copy-paste this into any AI assistant)

Copy the block below into **any** AI assistant (Cursor, Claude Code, Gemini CLI, opencode, Copilot, Windsurf, Aider, etc.). The assistant will install the package, wire it into your MCP client, and verify the connection.

````markdown
Install the @imhecateq/mcp-coolify MCP server on this machine.

Ask me first for:
- COOLIFY_URL
- COOLIFY_API_TOKEN (read-only token is fine)
- Whether I want stdio or http transport

Then:
1. Run: npm install -g @imhecateq/mcp-coolify
2. Find the install path with: npm root -g
3. Add an MCP entry to whatever client config I'm using (opencode.json, .cursor/mcp.json, claude_desktop_config.json, etc.):
   - command: node
   - args: ["<npm root -g path>/@imhecateq/mcp-coolify/dist/index.js"]
   - env: { COOLIFY_URL, COOLIFY_API_TOKEN, MCP_TRANSPORT: "stdio", COOLIFY_OPERATION_MODE: "read-only" }
4. Restart the MCP client
5. Confirm it works by calling coolify_health

Show me what changed when done.
````

See [INSTALL_PROMPT.md](./INSTALL_PROMPT.md) for a standalone copy.

---

## Environment Variables

All configuration is via environment variables. Read from `src/config/schema.ts` via Zod validation.

### Required

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `COOLIFY_URL` | `string` (URL) | — | Base URL of your Coolify instance (e.g. `https://coolify.example.com`). Trailing slashes are stripped. |

### API Tokens (at least one required)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `COOLIFY_API_TOKEN` | `string` | — | Fallback API token (used when no scoped token matches) |
| `COOLIFY_READ_TOKEN` | `string` | — | Read-only token for normal read operations |
| `COOLIFY_SENSITIVE_TOKEN` | `string` | — | Token for reading sensitive data (envs, logs) |
| `COOLIFY_WRITE_TOKEN` | `string` | — | Token for write operations (env vars, settings) |
| `COOLIFY_DEPLOY_TOKEN` | `string` | — | Token for deploy operations |

> **Note:** Scoped tokens override `COOLIFY_API_TOKEN`. The server automatically selects the least-privilege token for each operation.

### Transport

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `MCP_TRANSPORT` | `"stdio"` \| `"http"` | `"stdio"` | Transport mode |
| `MCP_HTTP_HOST` | `string` | `"0.0.0.0"` | HTTP transport host (only used when `MCP_TRANSPORT=http`) |
| `MCP_HTTP_PORT` | `number` (1–65535) | `3000` | HTTP transport port |
| `MCP_SERVER_API_KEY` | `string` | — | API key for authenticating HTTP MCP requests (required for HTTP transport) |

### Operation Mode

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `COOLIFY_OPERATION_MODE` | `"read-only"` \| `"deploy-only"` \| `"safe-write"` | `"read-only"` | Restricts what operations the MCP server allows |

### Allowlists (Optional)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `COOLIFY_ALLOWED_PROJECT_UUIDS` | `string` (comma-separated identifiers) | — | Restrict access to specific projects. Accepts UUID v4 or Coolify-native identifiers |
| `COOLIFY_ALLOWED_ENVIRONMENT_UUIDS` | `string` (comma-separated identifiers) | — | Restrict access to specific environments. Accepts UUID v4 or Coolify-native identifiers |
| `COOLIFY_ALLOWED_RESOURCE_UUIDS` | `string` (comma-separated identifiers) | — | Restrict access to specific resources. Accepts UUID v4 or Coolify-native identifiers |

### Production Protection

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `COOLIFY_PRODUCTION_ENV_NAMES` | `string` (comma-separated) | `"production,prod"` | Environment names considered "production" |
| `COOLIFY_DENY_PRODUCTION_MUTATIONS` | `"true"` \| `"false"` | `"true"` | Block all mutations on production environments |
| `COOLIFY_ALLOW_PRODUCTION_DEPLOY` | `"true"` \| `"false"` | `"false"` | Allow deploy on production (only if `DENY_PRODUCTION_MUTATIONS` is false) |
| `COOLIFY_ALLOW_STOP` | `"true"` \| `"false"` | `"false"` | Allow stop operations (globally) |
| `COOLIFY_ALLOW_ENV_WRITE` | `"true"` \| `"false"` | `"false"` | Allow environment variable modifications |

### Logging

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `COOLIFY_LOG_MAX_LINES` | `number` (1–1000) | `200` | Max log lines to return from application logs |
| `LOG_LEVEL` | `string` | `"info"` | Pino log level (`"fatal"`, `"error"`, `"warn"`, `"info"`, `"debug"`, `"trace"`) |

---

## Local stdio Usage (OpenCode)

Add to your `opencode.local.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "coolify": {
      "type": "local",
      "command": ["node", "/path/to/coolify-mcp/dist/index.mjs"],
      "environment": {
        "COOLIFY_URL": "https://coolify.example.com",
        "COOLIFY_API_TOKEN": "{env:COOLIFY_API_TOKEN}",
        "COOLIFY_OPERATION_MODE": "read-only"
      }
    }
  }
}
```

A complete example is at [`examples/opencode.local.jsonc`](examples/opencode.local.jsonc).

---

## Remote HTTP Usage (OpenCode)

When running the MCP server in HTTP mode behind a reverse proxy, configure OpenCode for remote access:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "coolify-remote": {
      "type": "remote",
      "url": "https://coolify-mcp.example.com/mcp",
      "headers": {
        "Authorization": "Bearer {env:MCP_SERVER_API_KEY}"
      }
    }
  }
}
```

A complete example is at [`examples/opencode.remote.jsonc`](examples/opencode.remote.jsonc).

### HTTP Transport Endpoints

| Endpoint | Auth Required | Purpose |
|----------|--------------|---------|
| `GET /healthz` | No | Liveness check — returns `{"ok":true,"status":"alive"}` |
| `GET /readyz` | No | Readiness check — verifies Coolify API is reachable |
| `POST /mcp` | Yes (Bearer) | MCP protocol endpoint — all tool calls go here |

---

## Tool Catalog

The server registers **42 tools**: 25 read-only tools and 17 action (mutation/deploy) tools.

> **Note:** Tool numbering is for reference only. Tools 1-15 are Phase 1 (original), tools 16-42 are Phase 2 (new).

### Read Tools (25)

#### Core Read Tools (10 — Phase 1)

| # | Tool Name | Purpose | Input | Read-Only | Idempotent |
|---|-----------|---------|-------|:---------:|:----------:|
| 1 | `coolify_health` | Check Coolify API and MCP server connectivity. Returns health status, auth status, and latency. No secrets in response. | `{}` | ✅ | ✅ |
| 2 | `coolify_list_projects` | List all Coolify projects with optional name filter. | `name?` (string) | ✅ | ✅ |
| 3 | `coolify_get_project` | Get a single project by UUID with its environments and resource counts. | `uuid` (resource ID) | ✅ | ✅ |
| 4 | `coolify_list_resources` | List all resources with filters. | `project_uuid?`, `environment_uuid?`, `resource_type?` (enum: 7 types), `status?` (enum: 5 statuses), `search?` (string) | ✅ | ✅ |
| 5 | `coolify_get_resource` | Get a single resource detail by UUID and type. Sensitive fields (DB URLs) redacted. | `uuid` (resource ID), `type` (enum: application/service/database) | ✅ | ✅ |
| 6 | `coolify_project_overview` | High-level project overview: project info, envs, resources, deployments, health summary. Aggregates 4 API calls into one. | `project_uuid` (resource ID) | ✅ | ✅ |
| 7 | `coolify_list_deployments` | List deployments with filters. Newest first. | `resource_uuid?`, `status?` (enum: 5 statuses), `limit?` (1–50) | ✅ | ✅ |
| 8 | `coolify_get_deployment` | Get deployment detail by UUID: status, timestamps, commit info, error summary. | `deployment_uuid` (string) | ✅ | ✅ |
| 9 | `coolify_get_application_logs` | Get application logs (capped by `COOLIFY_LOG_MAX_LINES`). Secrets redacted. | `application_uuid` (resource ID), `lines?` (10–1000) | ✅ | ✅ |
| 10 | `coolify_list_environment_variables` | List env vars for a resource. **Values are NEVER returned** — only keys and metadata. | `application_uuid` (resource ID) | ✅ | ✅ |

#### GitHub Discovery Tools (3 — Phase 2)

| # | Tool Name | Purpose | Input | Read-Only | Idempotent |
|---|-----------|---------|-------|:---------:|:----------:|
| 16 | `coolify_list_github_apps` | List GitHub Apps connected to your Coolify instance. Returns team and system-wide apps. No secrets. | `{}` | ✅ | ✅ |
| 17 | `coolify_list_repositories` | List repositories accessible via a GitHub App. Supports pagination and search. | `github_app_uuid` (resource ID), `search?` (string), `page?` (int), `limit?` (int) | ✅ | ✅ |
| 18 | `coolify_list_branches` | List branches of a GitHub repository via a GitHub App. | `github_app_uuid` (resource ID), `owner` (string), `repository` (string) | ✅ | ✅ |

#### Scheduled Task Read Tools (2 — Phase 2)

| # | Tool Name | Purpose | Input | Read-Only | Idempotent |
|---|-----------|---------|-------|:---------:|:----------:|
| 19 | `coolify_list_scheduled_tasks` | List scheduled tasks for an application or service. Returns task UUID, name, command, schedule, enabled, last execution. | `resource_uuid` (resource ID), `resource_type?` (string) | ✅ | ✅ |
| 20 | `coolify_get_task_executions` | Get execution history for a scheduled task. Output is redacted for security. | `task_uuid` (string), `resource_uuid?` (resource ID), `resource_type?` (string), `status?` (string), `limit?` (1–100) | ✅ | ✅ |

#### Backup Read Tool (1 — Phase 2)

| # | Tool Name | Purpose | Input | Read-Only | Idempotent |
|---|-----------|---------|-------|:---------:|:----------:|
| 21 | `coolify_list_database_backups` | List backup configurations and executions for a database. Sensitive destination paths are redacted. | `database_uuid` (resource ID) | ✅ | ✅ |

#### Server Read Tools (4 — Phase 2)

| # | Tool Name | Purpose | Input | Read-Only | Idempotent |
|---|-----------|---------|-------|:---------:|:----------:|
| 22 | `coolify_list_servers` | List all servers connected to your Coolify instance. Sensitive network info and SSH keys redacted. | `{}` | ✅ | ✅ |
| 23 | `coolify_get_server` | Get a single server detail by UUID. SSH keys and sensitive network info redacted. | `uuid` (resource ID) | ✅ | ✅ |
| 24 | `coolify_list_server_resources` | List resources associated with a specific server. | `server_uuid` (resource ID), `resource_type?` (string), `status?` (string) | ✅ | ✅ |
| 25 | `coolify_list_server_domains` | List domains associated with a server. | `server_uuid` (resource ID) | ✅ | ✅ |

#### Team Read Tools (2 — Phase 2)

| # | Tool Name | Purpose | Input | Read-Only | Idempotent |
|---|-----------|---------|-------|:---------:|:----------:|
| 26 | `coolify_get_current_team` | Get the current team context: id, name, and permission scope. | `{}` | ✅ | ✅ |
| 27 | `coolify_list_team_members` | List members of the current team. Email addresses policy-gated and redacted by default. | `{}` | ✅ | ✅ |

#### Storage Read Tool (1 — Phase 2)

| # | Tool Name | Purpose | Input | Read-Only | Idempotent |
|---|-----------|---------|-------|:---------:|:----------:|
| 28 | `coolify_list_storages` | List storage mounts for an app/service/database. Sensitive host paths redacted. | `resource_uuid` (resource ID), `resource_type` (enum: application/service/database) | ✅ | ✅ |

#### Configuration Update Tools (2 — Phase 2, safe-write)

| # | Tool Name | Purpose | Input | Read-Only | Idempotent |
|---|-----------|---------|-------|:---------:|:----------:|
| 29 | `coolify_update_application_config` | Update application config: health check, resource limits, replicas, ports, build settings. PATCH semantics. Audit: `coolify.application.config.update` | `application_uuid` (resource ID), `health_check?`, `cpu_limit?`, `memory_limit?`, `replicas?`, `ports?`, etc. | ✅ (safe-write) | ✅ |
| 30 | `coolify_update_database_config` | Update database config: CPU/memory limits, name, description. PATCH semantics. Audit: `coolify.database.config.update` | `database_uuid` (resource ID), `cpu_limit?`, `memory_limit?`, `name?`, `description?` | ✅ (safe-write) | ✅ |

### Action Tools (17)

#### Core Deploy Tools (5 — Phase 1)

| # | Tool Name | Purpose | Input | Destructive | Idempotent | Policy Checks |
|---|-----------|---------|-------|:-----------:|:----------:|---------------|
| 11 | `coolify_deploy` | Deploy a resource. Supports force deploy (POST vs GET). | `resource_uuid` (resource ID), `resource_type` (enum), `force?` (bool), `environment_name?` (string) | ❌ | ✅ | Mode + Scope + Production |
| 12 | `coolify_restart` | Restart a resource. | `resource_uuid` (resource ID), `resource_type` (enum), `environment_name?` (string) | ⚠️ | ❌ | Mode + Scope + Production |
| 13 | `coolify_start` | Start a stopped resource. | `resource_uuid` (resource ID), `resource_type` (enum), `environment_name?` (string) | ❌ | ✅ | Mode + Scope + Production |
| 14 | `coolify_stop` | Stop a resource. **Disabled by default** — must set `COOLIFY_ALLOW_STOP=true`. Marked destructive. | `resource_uuid` (resource ID), `resource_type` (enum), `environment_name?` (string) | ✅ | ❌ | AllowStop gate + Mode + Scope + Production |
| 15 | `coolify_set_environment_variable` | Set a single env var on a resource. **Disabled by default** — `COOLIFY_ALLOW_ENV_WRITE=true`. Value NEVER returned. | `resource_uuid` (resource ID), `key` (string 1–256), `value` (string 1–65536), `environment_name?` (string) | ⚠️ | ✅ | AllowEnvWrite gate + Mode + Scope + Production |

#### New Action Tools (6 — Phase 2, safe-write)

| # | Tool Name | Purpose | Input | Destructive | Idempotent | Policy Checks |
|---|-----------|---------|-------|:-----------:|:----------:|---------------|
| 31 | `coolify_create_project` | Create a new project. | `name` (string), `description?` (string) | ❌ | ✅ | Mode + Scope + Production |
| 32 | `coolify_create_environment` | Create a new environment within a project. | `project_uuid` (resource ID), `name` (string) | ❌ | ✅ | Mode + Scope + Production |
| 33 | `coolify_create_application` | Create a new application in a project environment. | `project_uuid` (resource ID), `environment_name` (string), `name` (string), `build_pack?`, `repository?`, etc. | ❌ | ✅ | Mode + Scope + Production |
| 34 | `coolify_create_service` | Create a new service in a project environment. | `project_uuid` (resource ID), `environment_name` (string), `name` (string), `image` (string), etc. | ❌ | ✅ | Mode + Scope + Production |
| 35 | `coolify_create_database` | Create a new database. Passwords/connection strings NEVER returned. | `project_uuid` (resource ID), `environment_name` (string), `name` (string), `database_type` (enum: 8 types), etc. | ❌ | ✅ | Mode + Scope + Production |
| 36 | `coolify_set_environment_variables` | Set multiple env vars in bulk (1–50). **Disabled by default** — `COOLIFY_ALLOW_ENV_WRITE=true`. Values NEVER returned. | `resource_uuid` (resource ID), `resource_type` (enum), `variables` (array of `{key, value}`), `environment_name?` (string) | ⚠️ | ✅ | AllowEnvWrite gate + Mode + Scope + Production |

#### Deployment Action Tool (1 — Phase 2)

| # | Tool Name | Purpose | Input | Destructive | Idempotent | Policy Checks |
|---|-----------|---------|-------|:-----------:|:----------:|---------------|
| 37 | `coolify_cancel_deployment` | Cancel a queued or in-progress deployment. Returns UNSUPPORTED_OPERATION for terminal states. Audit: `coolify.deployment.cancel` | `deployment_uuid` (string) | ❌ | ❌ | Mode + Scope |

#### Backup Action Tool (1 — Phase 2, safe-write)

| # | Tool Name | Purpose | Input | Destructive | Idempotent | Policy Checks |
|---|-----------|---------|-------|:-----------:|:----------:|---------------|
| 38 | `coolify_create_backup_config` | Create a backup config for a database. Cron expression validated. Audit: `coolify.database_backup_config.create` | `database_uuid` (resource ID), `schedule` (cron string), `destination_uuid?` (resource ID), `retention?` (int), `enabled?` (bool) | ❌ | ✅ | Mode + Scope + Production |

#### Scheduled Task Action Tools (2 — Phase 2, safe-write)

| # | Tool Name | Purpose | Input | Destructive | Idempotent | Policy Checks |
|---|-----------|---------|-------|:-----------:|:----------:|---------------|
| 39 | `coolify_create_scheduled_task` | Create a scheduled task (cron job). Cron expression validated. Audit: `coolify.scheduled_task.create` | `resource_uuid` (resource ID), `resource_type` (enum), `name` (string), `command` (string), `schedule` (cron string), `container?`, `timeout?` (int), `enabled?` (bool) | ❌ | ✅ | Mode + Scope + Production |
| 40 | `coolify_update_scheduled_task` | Update a scheduled task. | `task_uuid` (string), `resource_uuid` (resource ID), `resource_type` (enum), `name?`, `command?`, `schedule?` (cron string), `enabled?` (bool) | ❌ | ✅ | Mode + Scope + Production |

#### Server Validation Tool (1 — Phase 2)

| # | Tool Name | Purpose | Input | Destructive | Idempotent | Policy Checks |
|---|-----------|---------|-------|:-----------:|:----------:|---------------|
| 41 | `coolify_validate_server` | Validate server connectivity and configuration. Audited as mutation action. | `server_uuid` (resource ID) | ❌ | ✅ | Mode + Scope |

#### Storage Action Tool (1 — Phase 2, safe-write)

| # | Tool Name | Purpose | Input | Destructive | Idempotent | Policy Checks |
|---|-----------|---------|-------|:-----------:|:----------:|---------------|
| 42 | `coolify_create_storage` | Create a storage mount for a resource. Path traversal validated. Audit: `coolify.storage.create` | `resource_uuid` (resource ID), `resource_type` (enum), `storage_type?` (string), `source?` (string), `destination` (string) | ❌ | ✅ | Mode + Scope + Production |

### Policy Check Chain (Action Tools)

Every action tool runs through the following policy checks before executing:

1. **Allow Gate Check** — Some tools have dedicated allow gates: `COOLIFY_ALLOW_STOP` (for stop), `COOLIFY_ALLOW_ENV_WRITE` (for env var modifications). If the gate is closed, the operation is denied.
2. **Operation Mode Check** — Does the mode (`read-only`/`deploy-only`/`safe-write`) permit this operation?
3. **Scope/Allowlist Check** — Is the target resource UUID in the allowed list (if configured)?
4. **Production Guard Check** — If the `environment_name` matches a production pattern, is this mutation allowed?
5. **Input Validation** — All inputs are validated via Zod schemas. Cron expressions are validated. Path traversal is prevented for storage operations.
6. **Audit Logging** — Every mutation is logged with a structured audit event containing the operation, resource, and result (allowed/denied/error).

If any check fails, the operation is denied with a `POLICY_DENIED` error code and an audit event is logged.

### Common Response Format

All tools return a consistent JSON response structure:

**Success:**
```json
{
  "ok": true,
  "summary": "Found 3 project(s)",
  "data": [ /* ... */ ],
  "meta": {
    "durationMs": 42,
    "truncated": false
  }
}
```

**Error (policy denied):**
```json
{
  "ok": false,
  "summary": "Operation denied by policy",
  "error": {
    "code": "POLICY_DENIED",
    "message": "Operation mode is 'read-only' — 'deploy' operations are not permitted",
    "retryable": false
  },
  "meta": {
    "durationMs": 5
  }
}
```

**Error (upstream):**
```json
{
  "ok": false,
  "summary": "Failed to list projects",
  "error": {
    "code": "UPSTREAM_ERROR",
    "message": "Coolify API returned status 500",
    "retryable": true
  },
  "meta": {
    "durationMs": 1203
  }
}
```

### Error Codes

| Code | Meaning | Retryable |
|------|---------|-----------|
| `AUTHENTICATION_FAILED` | Token missing or invalid | ❌ |
| `PERMISSION_DENIED` | Token lacks required scope | ❌ |
| `POLICY_DENIED` | Operation blocked by MCP policy (mode/scope/production) | ❌ |
| `RESOURCE_NOT_FOUND` | Coolify resource not found (404) | ❌ |
| `RATE_LIMITED` | Coolify API rate limit hit (429) | ✅ |
| `COOLIFY_UNAVAILABLE` | Coolify instance unreachable or 5xx | ✅ |
| `REQUEST_TIMEOUT` | Request exceeded 30s timeout | ✅ |
| `VALIDATION_ERROR` | Invalid input parameters | ❌ |
| `UPSTREAM_ERROR` | Generic Coolify API error | varies |
| `INTERNAL_ERROR` | MCP server internal error | ❌ |

---

## Operation Modes

The `COOLIFY_OPERATION_MODE` environment variable controls what operations the MCP server permits:

### `read-only` (default)

Safe for monitoring and exploration. Only the 10 read tools are allowed. All 5 action tools return `POLICY_DENIED`.

| Allowed | Denied |
|---------|--------|
| All read tools (health, list, get, logs) | All action tools (deploy, restart, start, stop, set env) |

### `deploy-only`

Read access plus deploy operations (deploy, restart, start). Write operations (stop, set env vars) are denied.

| Allowed | Denied |
|---------|--------|
| All read tools | `coolify_stop` |
| `coolify_deploy` | `coolify_set_environment_variable` |
| `coolify_restart` | |
| `coolify_start` | |

### `safe-write`

Full read + deploy + write access. Stop and env-write are still gated behind their respective `ALLOW_*` flags.

| Allowed | Gated By |
|---------|----------|
| All read tools | — |
| `coolify_deploy` | — |
| `coolify_restart` | — |
| `coolify_start` | — |
| `coolify_stop` | `COOLIFY_ALLOW_STOP=true` |
| `coolify_set_environment_variable` | `COOLIFY_ALLOW_ENV_WRITE=true` |

### Mode Decision Matrix

| Operation | `read-only` | `deploy-only` | `safe-write` |
|-----------|:-----------:|:-------------:|:------------:|
| All read tools (25) | ✅ | ✅ | ✅ |
| `coolify_deploy` | ❌ | ✅ | ✅ |
| `coolify_restart` | ❌ | ✅ | ✅ |
| `coolify_start` | ❌ | ✅ | ✅ |
| `coolify_stop` | ❌ | ❌ | ✅ (if `ALLOW_STOP`) |
| `coolify_set_environment_variable` | ❌ | ❌ | ✅ (if `ALLOW_ENV_WRITE`) |
| `coolify_set_environment_variables` (bulk) | ❌ | ❌ | ✅ (if `ALLOW_ENV_WRITE`) |
| `coolify_cancel_deployment` | ❌ | ✅ | ✅ |
| `coolify_create_*` (project/env/app/service/db) | ❌ | ❌ | ✅ |
| `coolify_create_scheduled_task` | ❌ | ❌ | ✅ |
| `coolify_update_scheduled_task` | ❌ | ❌ | ✅ |
| `coolify_create_backup_config` | ❌ | ❌ | ✅ |
| `coolify_create_storage` | ❌ | ❌ | ✅ |
| `coolify_update_application_config` | ❌ | ❌ | ✅ |
| `coolify_update_database_config` | ❌ | ❌ | ✅ |
| `coolify_validate_server` | ❌ | ❌ | ✅ |

---

## Production Safeguards

### Production Environment Detection

The server defines "production" environments via `COOLIFY_PRODUCTION_ENV_NAMES` (default: `production,prod`). When an action tool receives an `environment_name` parameter, it checks if that name matches any production name (case-insensitive).

### Protection Layers

| Layer | Env Var | Default | Effect |
|-------|---------|---------|--------|
| **Deny All Production Mutations** | `COOLIFY_DENY_PRODUCTION_MUTATIONS` | `true` | Blocks ALL mutations (deploy, restart, start, stop, env write) on production environments |
| **Allow Production Deploy** | `COOLIFY_ALLOW_PRODUCTION_DEPLOY` | `false` | If `DENY_PRODUCTION_MUTATIONS` is `false`, this controls whether deploy is allowed on production |
| **Allow Stop** | `COOLIFY_ALLOW_STOP` | `false` | Globally disables stop operations. Required for production stop too |
| **Allow Env Write** | `COOLIFY_ALLOW_ENV_WRITE` | `false` | Globally disables env var modifications. Required for production env writes too |

### Recommended Production Configuration

```bash
# Strict — no mutations on production at all (default)
COOLIFY_OPERATION_MODE=read-only
COOLIFY_DENY_PRODUCTION_MUTATIONS=true
COOLIFY_ALLOW_STOP=false
COOLIFY_ALLOW_ENV_WRITE=false
```

```bash
# Moderate — allow deploys to production, block everything else
COOLIFY_OPERATION_MODE=deploy-only
COOLIFY_DENY_PRODUCTION_MUTATIONS=false
COOLIFY_ALLOW_PRODUCTION_DEPLOY=true
COOLIFY_ALLOW_STOP=false
COOLIFY_ALLOW_ENV_WRITE=false
```

---

## Docker Usage

### Build from source

```bash
npm run build
```

### Run with Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
services:
  coolify-mcp:
    build: .
    environment:
      COOLIFY_URL: "https://coolify.example.com"
      COOLIFY_API_TOKEN: "${COOLIFY_API_TOKEN}"
      MCP_TRANSPORT: "http"
      MCP_HTTP_PORT: "3000"
      MCP_SERVER_API_KEY: "${MCP_SERVER_API_KEY}"
      COOLIFY_OPERATION_MODE: "read-only"
    ports:
      - "3000:3000"
```

---

## Troubleshooting

### Server won't start

**Symptom:** `Configuration validation failed: coolifyUrl: Required`

**Fix:** Set `COOLIFY_URL` environment variable to your Coolify instance URL.

```bash
export COOLIFY_URL="https://coolify.example.com"
```

**Symptom:** `Configuration validation failed: coolifyUrl: Invalid URL`

**Fix:** Ensure `COOLIFY_URL` is a valid URL including protocol (`https://`).

### Authentication failures

**Symptom:** `AUTHENTICATION_FAILED` — "No Coolify API token configured"

**Fix:** Set at least `COOLIFY_API_TOKEN` or a scoped token like `COOLIFY_READ_TOKEN`.

### HTTP transport not working

**Symptom:** `MCP_SERVER_API_KEY is required for HTTP transport mode`

**Fix:** Set `MCP_SERVER_API_KEY` to a strong random key when using `MCP_TRANSPORT=http`.

```bash
# Generate a secure key
openssl rand -hex 32
```

### Production mutations blocked

**Symptom:** `POLICY_DENIED` — "Production mutations are denied"

**Cause:** Environment name matches a production pattern (default: `production`, `prod`) and `COOLIFY_DENY_PRODUCTION_MUTATIONS` is `true` (the default).

**Fix:** If intentional, use a non-production environment. To allow production mutations, set `COOLIFY_DENY_PRODUCTION_MUTATIONS=false` and review the specific allow flags.

### Stop operations blocked

**Symptom:** `POLICY_DENIED` — "Stop operations are disabled"

**Cause:** `COOLIFY_ALLOW_STOP` defaults to `false`.

**Fix:** Set `COOLIFY_ALLOW_STOP=true` if stop operations are required.

### Application logs truncated

**Symptom:** Logs show fewer lines than requested

**Cause:** Server caps at `COOLIFY_LOG_MAX_LINES` (default 200, max 1000).

**Fix:** Increase `COOLIFY_LOG_MAX_LINES` up to 1000, or request fewer lines.

---

## Development

### Commands

```bash
npm run dev          # Run in development mode with hot-reload (tsx watch)
npm run build        # Build to dist/ (tsup, ESM format)
npm start            # Run the built server
npm test             # Run all tests (vitest)
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint         # Lint source code
npm run lint:fix     # Fix lint issues
npm run format       # Format with Prettier
npm run typecheck    # Type-check without emitting (tsc --noEmit)
```

### Project Structure

```
src/
├── config/
│   ├── schema.ts              # Zod schema for all environment config
│   └── load-config.ts         # Config loading and validation
├── coolify/
│   ├── client.ts              # Coolify API HTTP client
│   ├── types.ts               # TypeScript types for Coolify data models
│   ├── normalizers.ts         # Response normalizers (strip undefined, redact secrets)
│   └── errors.ts              # Error handling and mapping
├── security/
│   ├── policy.ts              # Operation mode enforcement
│   ├── scope.ts               # Allowlist-based scope checking
│   ├── production-guard.ts    # Production environment protection
│   └── redaction.ts           # Secret redaction utilities
├── observability/
│   ├── logger.ts              # Pino logger with secret redaction
│   └── audit.ts               # Structured audit event logging
├── server/
│   └── create-server.ts       # MCP server setup and tool registration (42 tools)
├── tools/
│   ├── read/                  # 10 core read-only tools (Phase 1)
│   ├── actions/               # 11 action tools (5 Phase 1 + 6 Phase 2)
│   ├── discovery/             # 3 GitHub discovery tools (Phase 2)
│   ├── scheduled-tasks/       # 4 scheduled task tools (Phase 2)
│   ├── deployments/           # 1 deployment cancel tool (Phase 2)
│   ├── backups/               # 2 database backup tools (Phase 2)
│   ├── servers/               # 5 server tools (Phase 2)
│   ├── teams/                 # 2 team tools (Phase 2)
│   ├── configuration/         # 2 config update tools (Phase 2)
│   └── storage/               # 2 storage tools (Phase 2)
├── transports/
│   ├── stdio.ts               # stdio transport (default)
│   └── http.ts                # HTTP/SSE transport with auth
└── index.ts                   # Entry point
```

---

## License

[MIT](LICENSE)
