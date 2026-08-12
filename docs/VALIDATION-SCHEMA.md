# Resource ID Validation Schema

> **Last updated:** 2026-07-12
> **Related PR:** UUID → flexible resource ID migration

## Overview

This document describes the `coolifyResourceIdSchema` — the core validation schema used for all Coolify resource identifiers across the MCP server. It was introduced to replace the original UUID v4-only validation that proved too restrictive for production use.

## Why UUID-Only Validation Was Removed

The original codebase used `z.string().uuid()` to validate all resource identifiers (`project_uuid`, `resource_uuid`, `server_uuid`, etc.). This approach had several issues:

| Issue | Description |
|-------|-------------|
| **Coolify uses non-UUID identifiers** | Coolify generates base36-like identifiers for some resources (e.g., `abc123xyz`) that are valid resource pointers but fail UUID format validation |
| **Third-party tooling compatibility** | CI/CD tools, monitoring systems, and automation scripts often use their own naming conventions (e.g., `prod-web-01`) as resource identifiers |
| **Environment variable flexibility** | Allowlist variables (`COOLIFY_ALLOWED_PROJECT_UUIDS`, etc.) contained non-UUID identifiers from external systems |
| **Migration from other platforms** | Teams migrating from other PaaS solutions brought existing naming schemes that didn't conform to UUID v4 |
| **Developer friction** | UUID-only validation caused cryptic `Validation error` messages that required manual UUID conversion |

## The `coolifyResourceIdSchema`

### Definition

Located in `src/shared/schemas.ts`:

```typescript
import { z } from 'zod';

/**
 * Coolify resource identifier.
 * Coolify uses UUID v4 for most resources but also generates base36-like identifiers.
 * This schema accepts any alphanumeric string (1-128 chars) with dashes and underscores.
 */
export const coolifyResourceIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Resource ID must be alphanumeric with dashes/underscores only');
```

### Validation rules

| Rule | Value | Description |
|------|-------|-------------|
| **Type** | `string` | Must be a string value |
| **Trimmed** | Yes | Leading/trailing whitespace is stripped automatically |
| **Min length** | 1 | Cannot be empty |
| **Max length** | 128 | Reasonable upper bound to prevent abuse |
| **Allowed characters** | `a-z`, `A-Z`, `0-9`, `-`, `_` | No spaces, special chars, or unicode |
| **UUID v4 compatible** | ✅ | All valid UUID v4 strings pass this regex |
| **Base36 compatible** | ✅ | Coolify-native identifiers pass |

### Accepted formats

```
# UUID v4 (fully supported)
550e8400-e29b-41d4-a716-446655440000

# Coolify base36 / short IDs
abc123xyz
m5xk7q2p

# User-defined names
prod-web-01
staging_db_02
my-app-v3
```

## Parameters using this schema

All tool parameters that uniquely identify a Coolify resource use `coolifyResourceIdSchema`. These are grouped by semantic role:

### Project identifiers

| Parameter name | Used by |
|---------------|---------|
| `uuid` (project) | `coolify_get_project` |
| `project_uuid` | `coolify_create_environment`, `coolify_create_application`, `coolify_create_service`, `coolify_create_database`, `coolify_list_resources` (filter), `coolify_project_overview` |

### Environment identifiers

| Parameter name | Used by |
|---------------|---------|
| `environment_uuid` | `coolify_list_resources` (filter) |

### Resource identifiers (applications / services / databases)

| Parameter name | Used by |
|---------------|---------|
| `uuid` (resource) | `coolify_get_resource` |
| `resource_uuid` | `coolify_deploy`, `coolify_restart`, `coolify_start`, `coolify_stop`, `coolify_set_environment_variable`, `coolify_set_environment_variables`, `coolify_list_deployments` (filter), `coolify_list_scheduled_tasks`, `coolify_create_scheduled_task`, `coolify_update_scheduled_task`, `coolify_get_task_executions`, `coolify_create_storage`, `coolify_list_storages` |
| `application_uuid` | `coolify_get_application_logs`, `coolify_list_environment_variables`, `coolify_update_application_config` |
| `database_uuid` | `coolify_list_database_backups`, `coolify_create_backup_config`, `coolify_update_database_config` |

### Server identifiers

| Parameter name | Used by |
|---------------|---------|
| `server_uuid` | `coolify_get_server`, `coolify_list_server_resources`, `coolify_list_server_domains`, `coolify_validate_server` |

### GitHub App identifiers

| Parameter name | Used by |
|---------------|---------|
| `github_app_uuid` | `coolify_list_repositories`, `coolify_list_branches` |

### Backup destinations

| Parameter name | Used by |
|---------------|---------|
| `destination_uuid` | `coolify_create_backup_config` |

> **Note:** `deployment_uuid` and `task_uuid` remain as unvalidated `z.string()` since they come directly from Coolify API responses and are only used for lookup, not resource identification.

## Migration guide

### For developers working on this codebase

**Before** (UUID v4 only):
```typescript
import { z } from 'zod';

const schema = z.object({
  project_uuid: z.string().uuid(),
  resource_uuid: z.string().uuid(),
});
```

**After** (flexible resource ID):
```typescript
import { z } from 'zod';
import { coolifyResourceIdSchema } from '../../shared/schemas.js';

const schema = z.object({
  project_uuid: coolifyResourceIdSchema,
  resource_uuid: coolifyResourceIdSchema,
});
```

### Adding a new parameter

When adding a new tool parameter that accepts a Coolify resource identifier:

1. Import the schema:
   ```typescript
   import { coolifyResourceIdSchema } from '../../shared/schemas.js';
   ```
2. Use it in your Zod schema:
   ```typescript
   my_param: coolifyResourceIdSchema.describe('My parameter description'),
   ```
3. Update the tool catalog in `README.md` with the parameter type as `resource ID`.
4. Add the parameter to the table above in this document.

### Removing the schema (not recommended)

If a future version of Coolify standardizes on a single identifier format, the schema can be tightened by modifying `src/shared/schemas.ts`. All tools using `coolifyResourceIdSchema` will inherit the new validation automatically.

## Related environment variables

The allowlist variables also accept flexible identifiers:

| Variable | Accepts |
|----------|---------|
| `COOLIFY_ALLOWED_PROJECT_UUIDS` | UUID v4 and Coolify-native identifiers |
| `COOLIFY_ALLOWED_ENVIRONMENT_UUIDS` | UUID v4 and Coolify-native identifiers |
| `COOLIFY_ALLOWED_RESOURCE_UUIDS` | UUID v4 and Coolify-native identifiers |

These are validated at startup and matched against incoming tool call parameters using the same `coolifyResourceIdSchema` constraints.
