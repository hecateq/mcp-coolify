# Coolify MCP Server — Setup and Configuration Guide

This guide provides step-by-step instructions for setting up, configuring, and connecting the **Coolify MCP Server** to your AI agents (OpenCode, Claude, Cursor, etc.).

> **Target Audience:** DevOps engineers and developers who want to manage Coolify infrastructure with AI agents.
> **Last Updated:** v1.0.0

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Setup](#2-setup)
3. [Configuration (.env)](#3-configuration-env)
4. [Running](#4-running)
5. [OpenCode Integration](#5-opencode-integration)
6. [Docker Setup](#6-docker-setup)
7. [Verification](#7-verification)
8. [Usage Examples](#8-usage-examples)
9. [Security Recommendations](#9-security-recommendations)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Requirement | Description |
|-------------|-------------|
| **Node.js >= 18** | The project compiles to ESM format using `tsup`. Node 18+ is required. |
| **Coolify Instance** | A running Coolify server (e.g., `https://coolify.ornek.com`). |
| **Coolify API Token** | At least one API token obtained from the Coolify UI. The token must have the relevant scopes. |

### Obtaining a Coolify API Token

1. Log in to the Coolify admin panel.
2. Click your profile picture in the top-right corner → **Credentials** → **API Tokens**.
3. Click the **Create Token** button.
4. Give the token a name (e.g., `mcp-read`) and select the required scopes:
   - For read operations: `view:projects`, `view:resources`, `view:deployments`
   - For sensitive data reading: `view:envs`, `view:logs`
   - For deploy operations: `deploy:applications`
   - For write operations: `edit:envs`, `operate:applications`
5. Click **Save** to create the token and copy it to a secure location.
> **TIP:** For least-privilege access, create separate tokens for each operation type instead of using broad tokens. See the [Security Recommendations](#9-security-recommendations) section for details.

---

## 2. Setup

### Option A — Install from npm (Recommended)

```bash
# Install globally for CLI binary 'mcp-coolify'
npm install -g @imhecateq/mcp-coolify

# Or run directly on the fly
npx -y @imhecateq/mcp-coolify
```

### Option B — Clone and Build from Source

```bash
# 1. Clone the repository
git clone https://github.com/hecateq/mcp-coolify.git
cd mcp-coolify
# 2. Install dependencies
npm install
# 3. Compile TypeScript (tsup builds ESM into dist/ directory)
npm run build
# 4. Copy the environment variables template
cp .env.example .env
# 5. Edit the .env file (see next section)
# vi .env
```

After setup completes, the `dist/index.js` file should exist:

```bash
ls -la dist/index.js
# -rw-r--r--  ...  dist/index.js
```

---

## 3. Configuration (.env)

All configuration is done through environment variables. Variables are validated using a **Zod** schema in `src/config/schema.ts`.

### 3.1. Required Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `COOLIFY_URL` | `string` (URL) | — | Base URL of the Coolify instance. Must not end with `/` (auto-stripped). |

```bash
COOLIFY_URL=https://coolify.ornek.com
```

### 3.2. API Tokens (at least one required)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `COOLIFY_API_TOKEN` | `string` | — | **Fallback token.** Used when scoped tokens are not defined. |
| `COOLIFY_READ_TOKEN` | `string` | — | Token for read-only operations (listing, fetching). |
| `COOLIFY_SENSITIVE_TOKEN` | `string` | — | Token for sensitive data reading (environment variables, logs). |
| `COOLIFY_WRITE_TOKEN` | `string` | — | Token for write operations (environment variable add/edit). |
| `COOLIFY_DEPLOY_TOKEN` | `string` | — | Token for deploy/start/restart operations. |

> **IMPORTANT:** When scoped tokens (`COOLIFY_READ_TOKEN`, etc.) are defined, `COOLIFY_API_TOKEN` is overridden. The server automatically selects the least-privileged token for each operation. For example, if `COOLIFY_READ_TOKEN` is set, listing projects uses that token and the main token is never used.

### 3.3. Transport Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `MCP_TRANSPORT` | `"stdio"` \| `"http"` | `"stdio"` | MCP transport mode. Use `stdio` for local use, `http` for remote. |
| `MCP_HTTP_HOST` | `string` | `"0.0.0.0"` | HTTP server host address (only used when `MCP_TRANSPORT=http`). |
| `MCP_HTTP_PORT` | `number` (1–65535) | `3000` | HTTP server port number. |
| `MCP_SERVER_API_KEY` | `string` | — | API key for authenticating HTTP MCP requests. **Required in HTTP mode.** |

### 3.4. Operation Mode

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `COOLIFY_OPERATION_MODE` | `"read-only"` \| `"deploy-only"` \| `"safe-write"` | `"read-only"` | Controls which operations the server permits. |

- **`read-only`** (default): Only the 10 read tools run. All mutation tools are rejected.
- **`deploy-only`**: Allows read + deploy/restart/start operations. Stop and environment variable writes are rejected.
- **`safe-write`**: All read and deploy operations + stop (with `COOLIFY_ALLOW_STOP=true`) and environment variable writes (with `COOLIFY_ALLOW_ENV_WRITE=true`).

### 3.5. Allowlist (Optional)

Restrict access to specific resources using comma-separated UUID lists:

| Variable | Type | Description |
|----------|------|-------------|
| `COOLIFY_ALLOWED_PROJECT_UUIDS` | `string` (comma-separated UUID) | Only allow access to the specified projects. |
| `COOLIFY_ALLOWED_ENVIRONMENT_UUIDS` | `string` (comma-separated UUID) | Only allow access to the specified environments. |
| `COOLIFY_ALLOWED_RESOURCE_UUIDS` | `string` (comma-separated UUID) | Only allow access to the specified resources. |

```bash
COOLIFY_ALLOWED_PROJECT_UUIDS=abc12345-...,def67890-...
COOLIFY_ALLOWED_RESOURCE_UUIDS=xyz11111-...
```

### 3.6. Production Guards

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `COOLIFY_PRODUCTION_ENV_NAMES` | `string` (comma-separated) | `"production,prod"` | Environment names considered "production". |
| `COOLIFY_DENY_PRODUCTION_MUTATIONS` | `"true"` \| `"false"` | `"true"` | Block all mutations on production environments. |
| `COOLIFY_ALLOW_PRODUCTION_DEPLOY` | `"true"` \| `"false"` | `"false"` | Allow deploy to production (only when `DENY_PRODUCTION_MUTATIONS=false`). |
| `COOLIFY_ALLOW_STOP` | `"true"` \| `"false"` | `"false"` | Global permission for stop operations. |
| `COOLIFY_ALLOW_ENV_WRITE` | `"true"` \| `"false"` | `"false"` | Permission for environment variable changes. |

### 3.7. Logging

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `COOLIFY_LOG_MAX_LINES` | `number` (1–1000) | `200` | Maximum number of lines to return from application logs. |

### 3.8. Example `.env` File

```bash
# ─── Required ────────────────────────────────────────────────────
COOLIFY_URL=https://coolify.ornek.com
COOLIFY_API_TOKEN=cof_token_ornek-api-token-buraya-gelir
# ─── Transport ──────────────────────────────────────────────────
# "stdio" (default) or "http"
MCP_TRANSPORT=stdio
# MCP_HTTP_HOST=0.0.0.0
# MCP_HTTP_PORT=3000
# MCP_SERVER_API_KEY=
# ─── Operation Mode ──────────────────────────────────────────────
COOLIFY_OPERATION_MODE=read-only
# ─── Production Protection ─────────────────────────────────────────
COOLIFY_PRODUCTION_ENV_NAMES=production,prod
COOLIFY_DENY_PRODUCTION_MUTATIONS=true
COOLIFY_ALLOW_PRODUCTION_DEPLOY=false
COOLIFY_ALLOW_STOP=false
COOLIFY_ALLOW_ENV_WRITE=false
# ─── Logging ───────────────────────────────────────────────────
COOLIFY_LOG_MAX_LINES=200
```

> **NOTE:** The `COOLIFY_API_TOKEN` value starts with the `cof_` prefix (Coolify-generated token format). Obtain your real token from the Coolify admin panel.

---

## 4. Running

### 4.1. Local (stdio) — Default Mode

```bash
# Run by reading variables from .env file
MCP_TRANSPORT=stdio npm start

# Or if .env is already configured, run directly:
npm start
```

When started, the server does not listen on any port — it communicates via the MCP protocol over **stdin/stdout**. This mode is ideal for connecting to AI tools like OpenCode locally.

### 4.2. Remote (HTTP) — Server Mode

```bash
MCP_TRANSPORT=http \
  MCP_HTTP_PORT=3000 \
  MCP_SERVER_API_KEY=guclu-bir-api-anahtari \
  npm start
```

In this mode, the server accepts MCP requests over HTTP + SSE (Server-Sent Events).

**HTTP Endpoints:**

| Endpoint | Auth Required | Purpose |
|----------|---------------|---------|
| `GET /healthz` | No | Health check — returns `{"ok":true,"status":"alive"}`. |
| `GET /readyz` | No | Readiness check — verifies Coolify API access. |
| `POST /mcp` | Yes (Bearer) | All MCP tool calls go to this endpoint. |

```bash
# Health check
curl http://localhost:3000/healthz
# {"ok":true,"status":"alive"}
# Readiness check (tests Coolify API connection)
curl http://localhost:3000/readyz
# {"ok":true,"coolifyUrl":"https://coolify.ornek.com","authStatus":"authenticated"}
```

> **WARNING:** In production, always run the HTTP mode behind a reverse proxy (Nginx, Caddy) with HTTPS.

---

## 5. OpenCode Integration

### 5.1. Local (stdio) Connection

Content of `examples/opencode.local.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "coolify": {
      "type": "local",
      // Option A: Direct via npx
      "command": ["npx", "-y", "@imhecateq/mcp-coolify"],
      // Option B: Local clone build: ["node", "/path/to/mcp-coolify/dist/index.js"]
      "environment": {
        // ─── Required ────────────────────────────────────────
        "COOLIFY_URL": "https://coolify.ornek.com",
        "COOLIFY_API_TOKEN": "{env:COOLIFY_API_TOKEN}",
        // ─── Optional: Scoped Tokens ──────────────
        // Scoped tokens instead of COOLIFY_API_TOKEN
        // "COOLIFY_READ_TOKEN": "{env:COOLIFY_READ_TOKEN}",
        // "COOLIFY_SENSITIVE_TOKEN": "{env:COOLIFY_SENSITIVE_TOKEN}",
        // "COOLIFY_WRITE_TOKEN": "{env:COOLIFY_WRITE_TOKEN}",
        // "COOLIFY_DEPLOY_TOKEN": "{env:COOLIFY_DEPLOY_TOKEN}",
        // ─── Operation Mode ──────────────────────────────────
        "COOLIFY_OPERATION_MODE": "read-only",
        // ─── Allowlist (Optional) ─────────────────────────
        // "COOLIFY_ALLOWED_PROJECT_UUIDS": "uuid1,uuid2",
        // "COOLIFY_ALLOWED_RESOURCE_UUIDS": "uuid3"
      }
    }
  }
}
```

**Activation in OpenCode:**

1. Add the above configuration to your `opencode.local.jsonc` file.
2. For the `{env:COOLIFY_API_TOKEN}` reference, define the token as a shell environment variable:
   ```bash
   export COOLIFY_API_TOKEN=cof_token_...
   ```
3. Restart OpenCode. It should appear as `coolify` in the `MCP Servers` list.

### 5.2. Remote (HTTP) Connection

Content of `examples/opencode.remote.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "coolify-remote": {
      "type": "remote",
      "url": "https://coolify-mcp.ornek.com/mcp",
      "headers": {
        "Authorization": "Bearer {env:MCP_SERVER_API_KEY}"
      }
    }
  }
}
```

**Activation in OpenCode:**

1. Run the Coolify MCP Server in HTTP mode (see [Section 4.2](#42-remote-http--server-mode)).
2. Add the above configuration to your `opencode.remote.jsonc` file.
3. Define the `MCP_SERVER_API_KEY` environment variable:
   ```bash
   export MCP_SERVER_API_KEY=guclu-bir-api-anahtari
   ```
4. Restart OpenCode.

> **TIP:** For remote connections, it is recommended to publish the MCP Server behind a reverse proxy with HTTPS. Do not expose it directly to the internet.

---

## 6. Docker Setup

The project includes a `Dockerfile` prepared with a multi-stage Docker build. It is optimized for production: non-root user, HEALTHCHECK, minimal image size.

```bash
# 1. Build the image
docker build -t coolify-mcp .

# 2. Run the container (HTTP mode)
docker run -d --name coolify-mcp --restart unless-stopped \
  -p 3000:3000 \
  -e COOLIFY_URL=https://coolify.ornek.com \
  -e COOLIFY_API_TOKEN=cof_token_... \
  -e MCP_TRANSPORT=http \
  -e MCP_SERVER_API_KEY=guclu-bir-api-anahtari \
  coolify-mcp

# 3. Verify the health check is working
curl http://localhost:3000/healthz
```

### With Docker Compose

```yaml
version: "3.9"
services:
  coolify-mcp:
    build: .
    environment:
      COOLIFY_URL: "https://coolify.ornek.com"
      COOLIFY_API_TOKEN: "${COOLIFY_API_TOKEN}"
      MCP_TRANSPORT: "http"
      MCP_HTTP_PORT: "3000"
      MCP_SERVER_API_KEY: "${MCP_SERVER_API_KEY}"
      COOLIFY_OPERATION_MODE: "read-only"
    ports:
      - "3000:3000"
    restart: unless-stopped
```

```bash
docker compose up -d
```

### Dockerfile Structure

| Stage | Base Image | Purpose |
|-------|-----------|---------|
| `builder` | `node:22-alpine` | Install dependencies, compile TypeScript |
| `runner` | `node:22-alpine` | Minimal production image, non-root `mcp` user |

- **HEALTHCHECK:** Checks the `GET /healthz` endpoint every 30 seconds.
- **Non-root:** Runs as `mcp` user (UID 1001).
- **Port:** 3000 (EXPOSE).

---

## 7. Verification

To verify the setup is working correctly, run the following commands in order:

### 7.1. Build Check

```bash
npm run build
# tsup produces dist/index.js; if no errors, it's done.
```

### 7.2. Type Check

```bash
npm run typecheck
# tsc --noEmit — if no type errors, it passes.
```

### 7.3. Tests

```bash
npm test
# vitest runs the entire test suite.
```

### 7.4. HTTP Health Check (HTTP mode)

```bash
curl http://localhost:3000/healthz
# {"ok":true,"status":"alive"}
```

### 7.5. MCP Health Tool (both modes)

Via an MCP client (OpenCode, Claude Desktop, etc.):

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

Successful response:

```json
{
  "content": [{
    "text": "{\n  \"ok\": true,\n  \"coolifyUrl\": \"[CONFIGURED]\",\n  \"authStatus\": \"authenticated\",\n  \"latencyMs\": 42,\n  \"transport\": \"stdio\"\n}"
  }]
}
```

---

## 8. Usage Examples

The server registers a total of **15 tools**: 10 read-only and 5 mutation actions. Below are examples for the most commonly used tools.

### 8.1. `coolify_health` — Connection Check

Tests the connection between the Coolify API and the MCP server.

```json
{
  "name": "coolify_health",
  "arguments": {}
}
```

```json
{
  "ok": true,
  "summary": "Coolify API is reachable and authenticated",
  "data": {
    "ok": true,
    "coolifyUrl": "https://coolify.ornek.com",
    "authStatus": "authenticated",
    "latencyMs": 42,
    "transport": "stdio"
  },
  "meta": { "durationMs": 42 }
}
```

### 8.2. `coolify_list_projects` — List Projects

```json
{
  "name": "coolify_list_projects",
  "arguments": {
    "name": "my-project"
  }
}
```

```json
{
  "ok": true,
  "summary": "Found 1 project(s)",
  "data": [
    {
      "uuid": "a1b2c3d4-...",
      "name": "my-project",
      "description": "Production web app"
    }
  ],
  "meta": { "durationMs": 120, "truncated": false }
}
```

### 8.3. `coolify_project_overview` — Project Overview

Retrieves project info, environments, resource status, and recent deployments in a single call (combines 4 API calls into one tool).

```json
{
  "name": "coolify_project_overview",
  "arguments": {
    "project_uuid": "a1b2c3d4-..."
  }
}
```

### 8.4. `coolify_deploy` — Deploy

```json
{
  "name": "coolify_deploy",
  "arguments": {
    "resource_uuid": "x1y2z3-...",
    "resource_type": "application",
    "force": false,
    "environment_name": "staging"
  }
}
```

> **NOTE:** The deploy operation goes through a 3-layer policy check: (1) Operation Mode, (2) Scope/Allowlist, (3) Production Guard. If any layer rejects it, a `POLICY_DENIED` error is returned.

---

## 9. Security Recommendations

### 9.1. Least-Privilege Token Usage

`COOLIFY_API_TOKEN` is sufficient on its own, but it is recommended to use **scoped tokens** for security:

| Token | Scope | Purpose |
|-------|-------|---------|
| `COOLIFY_READ_TOKEN` | `view:projects`, `view:resources` | Listings and queries |
| `COOLIFY_SENSITIVE_TOKEN` | `view:envs`, `view:logs` | Log and environment variable reading |
| `COOLIFY_DEPLOY_TOKEN` | `deploy:applications` | Deploy/restart/start |
| `COOLIFY_WRITE_TOKEN` | `edit:envs`, `operate:applications` | Environment variable writes, stop |

The server automatically selects the **least-privileged token** for each operation.

### 9.2. Starting in Read-Only Mode

Use `read-only` mode by default in production:

```bash
COOLIFY_OPERATION_MODE=read-only
```

In this mode, all 5 action tools return `POLICY_DENIED`. Only observation is performed; no changes occur.

### 9.3. Strong API Key for Remote MCP

`MCP_SERVER_API_KEY` is required in HTTP mode. To generate a strong key:

```bash
openssl rand -hex 32
# Example output: 7f8a9b3c2d1e0f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f
```

Place this key in the `.env` file or a secure secret manager. Never embed it in code.

### 9.4. Scope Restriction with Allowlist

Use an allowlist to restrict the server to specific projects/environments/resources:

```bash
COOLIFY_ALLOWED_PROJECT_UUIDS=abc-...,def-...
COOLIFY_ALLOWED_RESOURCE_UUIDS=xyz-...
```

When the allowlist is empty, access to all resources is permitted. When populated, only resources whose UUIDs are in the list can be operated on.

### 9.5. Keep Production Guards Enabled

```bash
# Stritest settings (default)
COOLIFY_DENY_PRODUCTION_MUTATIONS=true
COOLIFY_ALLOW_STOP=false
COOLIFY_ALLOW_ENV_WRITE=false
```

With these settings, any mutation (deploy, restart, stop, environment variable change) on production environments is completely blocked.

### 9.6. Automatic Secret Redaction

- **Environment variable values are NEVER returned.** The `coolify_list_environment_variables` tool only returns keys and metadata.
- Logs are scanned against `Bearer`, `password`, `secret`, `api_key` patterns and automatically redacted.
- The Pino logger defines built-in redaction paths for sensitive fields.
- Audit events do not contain secret values.

---

## 10. Troubleshooting

### 10.1. Server Won't Start

| Error | Cause | Fix |
|-------|-------|-----|
| `Configuration validation failed: coolifyUrl: Required` | `COOLIFY_URL` variable not defined | Add `COOLIFY_URL=https://coolify.ornek.com` to `.env` |
| `Configuration validation failed: coolifyUrl: Invalid URL` | `COOLIFY_URL` is not a valid URL | Include the protocol: `https://coolify.ornek.com` (not just `coolify.ornek.com`) |
| `MCP_SERVER_API_KEY is required for HTTP transport mode` | API key missing in HTTP mode | Define `MCP_SERVER_API_KEY`: generate a strong key with `openssl rand -hex 32` |

### 10.2. Authentication Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `AUTHENTICATION_FAILED` — "Invalid or missing API token" | Token invalid or not set | Verify the token in `COOLIFY_API_TOKEN` is correct and active |
| `PERMISSION_DENIED` — "Insufficient token permissions" | Token lacks required scope | Use a token with the necessary scopes, or use a broader fallback token |

### 10.3. Policy Denials

| Error | Cause | Fix |
|-------|-------|-----|
| `POLICY_DENIED` — "Operation mode is 'read-only'" | Insufficient mode | Set `COOLIFY_OPERATION_MODE` to `deploy-only` or `safe-write` |
| `POLICY_DENIED` — "Resource not in allowed list" | UUID not in allowlist | Add the relevant UUID to the allowlist, or clear the allowlist |
| `POLICY_DENIED` — "Production mutations are denied" | Mutation blocked on production environment | Use a non-production environment, or set `COOLIFY_DENY_PRODUCTION_MUTATIONS=false` |
| `POLICY_DENIED` — "Stop operations are disabled" | Stop operation is disabled | Set `COOLIFY_ALLOW_STOP=true` |
| `POLICY_DENIED` — "Environment variable write operations are disabled" | Environment variable writing is disabled | Set `COOLIFY_ALLOW_ENV_WRITE=true` |

### 10.4. Connection Issues

| Error | Cause | Fix |
|-------|-------|-----|
| `COOLIFY_UNAVAILABLE` — "Coolify instance unreachable" | Cannot reach Coolify URL | Check the URL and ensure the Coolify instance is running |
| `REQUEST_TIMEOUT` | Request exceeded 30 seconds | Check network connectivity, reduce Coolify load |
| `RATE_LIMITED` | Coolify API rate limit exceeded | Wait and retry (retryable ✅) |

### 10.5. HTTP Transport Not Working

```bash
# 1. Make sure the API key is configured
echo $MCP_SERVER_API_KEY
# 2. Check the health endpoint
curl -v http://localhost:3000/healthz
# 3. MCP endpoint'ini token ile test edin
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer ${MCP_SERVER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### 10.6. Truncated Logs

**Symptom:** Logs return fewer lines than expected.

**Cause:** The server is limited by `COOLIFY_LOG_MAX_LINES` (default: 200, max: 1000).

**Fix:** Increase to `COOLIFY_LOG_MAX_LINES=1000` or request fewer lines.

---

## Appendix: Tool Catalog

The server registers **42 tools** across 10 functional domains (25 read-only tools and 17 action/mutation tools):

### Domain Summary

| Domain | Total Tools | Read Tools | Action Tools | Highlights |
|--------|:-----------:|:----------:|:------------:|------------|
| **Core & Projects** | 7 | 5 | 2 | `coolify_health`, `coolify_list_projects`, `coolify_get_project`, `coolify_project_overview`, `coolify_create_project`, `coolify_create_environment` |
| **Resources & Applications** | 5 | 2 | 3 | `coolify_list_resources`, `coolify_get_resource`, `coolify_create_application`, `coolify_create_service`, `coolify_create_database` |
| **Deployments & Lifecycle** | 5 | 2 | 3 | `coolify_list_deployments`, `coolify_get_deployment`, `coolify_deploy`, `coolify_restart`, `coolify_start`, `coolify_cancel_deployment` |
| **Logs & Environment Variables** | 4 | 2 | 2 | `coolify_get_application_logs`, `coolify_list_environment_variables`, `coolify_set_environment_variable`, `coolify_set_environment_variables` |
| **GitHub Discovery** | 3 | 3 | 0 | `coolify_list_github_apps`, `coolify_list_repositories`, `coolify_list_branches` |
| **Scheduled Tasks (Cron)** | 4 | 2 | 2 | `coolify_list_scheduled_tasks`, `coolify_get_task_executions`, `coolify_create_scheduled_task`, `coolify_update_scheduled_task` |
| **Database Backups** | 2 | 1 | 1 | `coolify_list_database_backups`, `coolify_create_backup_config` |
| **Servers & Domains** | 5 | 4 | 1 | `coolify_list_servers`, `coolify_get_server`, `coolify_list_server_resources`, `coolify_list_server_domains`, `coolify_validate_server` |
| **Teams** | 2 | 2 | 0 | `coolify_get_current_team`, `coolify_list_team_members` |
| **Storage & Mounts** | 2 | 1 | 1 | `coolify_list_storages`, `coolify_create_storage` |
| **Configuration (safe-write)** | 2 | 0 | 2 | `coolify_update_application_config`, `coolify_update_database_config` |
| **Emergency Control** | 1 | 0 | 1 | `coolify_stop` (gated by `COOLIFY_ALLOW_STOP=true`) |

> For the complete 42-tool parameter list and detailed descriptions, refer to [README.md Tool Catalog](../README.md#-tool-catalog).

All action tools pass through the following policy checks:

1. **Allow Gate Check** — dedicated allow flags (`COOLIFY_ALLOW_STOP`, `COOLIFY_ALLOW_ENV_WRITE`).
2. **Operation Mode Check** — `read-only`, `deploy-only`, or `safe-write`.
3. **Scope/Allowlist Check** — UUID allowlist validation if configured.
4. **Production Guard Check** — production environment mutation protection.
5. **Input Validation & Audit** — Zod schema validation, cron verification, path traversal protection, and audit logging.

---

## Appendix: Recommended Production Configurations

### Strict — No Mutations Allowed in Production (Default)

```bash
COOLIFY_OPERATION_MODE=read-only
COOLIFY_DENY_PRODUCTION_MUTATIONS=true
COOLIFY_ALLOW_STOP=false
COOLIFY_ALLOW_ENV_WRITE=false
```

### Moderate — Deploy Only to Production

```bash
COOLIFY_OPERATION_MODE=deploy-only
COOLIFY_DENY_PRODUCTION_MUTATIONS=false
COOLIFY_ALLOW_PRODUCTION_DEPLOY=true
COOLIFY_ALLOW_STOP=false
COOLIFY_ALLOW_ENV_WRITE=false
```

### Advanced — Full Authority in Staging, Deploy Only in Production

```bash
# Separate MCP instance for staging:
COOLIFY_OPERATION_MODE=safe-write
COOLIFY_ALLOW_STOP=true
COOLIFY_ALLOW_ENV_WRITE=true

# Separate MCP instance for production:
COOLIFY_OPERATION_MODE=deploy-only
COOLIFY_DENY_PRODUCTION_MUTATIONS=false
COOLIFY_ALLOW_PRODUCTION_DEPLOY=true
COOLIFY_ALLOW_STOP=false
COOLIFY_ALLOW_ENV_WRITE=false
```

---

## Appendix: Error Codes

| Code | Meaning | Retryable? |
|------|---------|-----------|
| `AUTHENTICATION_FAILED` | Token missing or invalid | ❌ |
| `PERMISSION_DENIED` | Token lacks sufficient permissions | ❌ |
| `POLICY_DENIED` | Blocked by MCP policy | ❌ |
| `RESOURCE_NOT_FOUND` | Resource not found (404) | ❌ |
| `RATE_LIMITED` | Coolify API rate limit exceeded (429) | ✅ |
| `COOLIFY_UNAVAILABLE` | Coolify instance unreachable (5xx) | ✅ |
| `REQUEST_TIMEOUT` | Request timed out after 30 seconds | ✅ |
| `VALIDATION_ERROR` | Invalid input parameters | ❌ |
| `UPSTREAM_ERROR` | General Coolify API error | varies |
| `INTERNAL_ERROR` | MCP server internal error | ❌ |

---

## References

- [Coolify MCP Server README](../README.md)
- [.env.example](../.env.example)
- [OpenCode MCP Configuration](https://opencode.ai/docs/mcp)
- [Coolify API Documentation](https://coolify.io/docs/api-reference)
