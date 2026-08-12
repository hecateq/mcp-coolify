import { normalizeResources } from './normalizers.js';
import type { CoolifyClient } from './client.js';
import type {
  CoolifyEnvironment,
  CoolifyResource,
  NormalizedResource,
} from './types.js';

/**
 * Shared filter/relationship queries for resources.
 *
 * The Coolify `/resources` endpoint returns resources WITHOUT `project_uuid` or
 * `environment_uuid`; it only exposes a numeric `environment_id`. The only way
 * to associate a resource with a project/environment is through the
 * project's environments (numeric `id` + `uuid`). All resolution lives here so
 * `list_resources` and `project_overview` behave identically.
 */
export interface ResourceQueryFilters {
  project_uuid?: string;
  environment_uuid?: string;
  resource_type?: string;
  status?: string;
  search?: string;
}

interface EnvironmentRef {
  id: number;
  uuid: string;
  projectUuid: string;
}

export async function fetchAllResources(
  client: CoolifyClient,
): Promise<CoolifyResource[]> {
  const response = await client.listResources();
  const data = response.data;
  return Array.isArray(data) ? (data as CoolifyResource[]) : [];
}

/**
 * Builds a global environment index: numeric environment id -> { uuid, projectUuid }.
 * Uses one lightweight request per project, run in parallel.
 */
async function resolveEnvironmentIndex(
  client: CoolifyClient,
): Promise<Map<number, EnvironmentRef>> {
  const index = new Map<number, EnvironmentRef>();

  const projectsRes = await client.listProjects();
  const projects = Array.isArray(projectsRes.data)
    ? (projectsRes.data as { uuid?: string }[])
    : [];

  const envLists = await Promise.all(
    projects.map(async (project) => {
      if (!project.uuid) {
        return [] as CoolifyEnvironment[];
      }
      try {
        const res = await client.getProjectEnvironments(project.uuid);
        return Array.isArray(res.data) ? (res.data as CoolifyEnvironment[]) : [];
      } catch {
        return [] as CoolifyEnvironment[];
      }
    }),
  );

  projects.forEach((project, projectIndex) => {
    if (!project.uuid) {
      return;
    }
    for (const env of envLists[projectIndex] ?? []) {
      if (typeof env.id === 'number' && env.uuid) {
        index.set(env.id, { id: env.id, uuid: env.uuid, projectUuid: project.uuid });
      }
    }
  });

  return index;
}

function matchesFilters(
  resource: CoolifyResource,
  filters: ResourceQueryFilters,
  envIndex?: Map<number, EnvironmentRef>,
): boolean {
  if (filters.project_uuid || filters.environment_uuid) {
    const env = envIndex?.get(resource.environment_id ?? -1);
    if (filters.project_uuid) {
      if (!env || env.projectUuid !== filters.project_uuid) {
        return false;
      }
    }
    if (filters.environment_uuid) {
      if (!env || env.uuid !== filters.environment_uuid) {
        return false;
      }
    }
  }

  if (filters.resource_type && resource.type !== filters.resource_type) {
    return false;
  }
  if (filters.status && resource.status !== filters.status) {
    return false;
  }
  if (filters.search) {
    const search = filters.search.toLowerCase();
    if (!resource.name.toLowerCase().includes(search)) {
      return false;
    }
  }
  return true;
}

function enrichResource(
  resource: CoolifyResource,
  envIndex: Map<number, EnvironmentRef>,
): CoolifyResource {
  const env = envIndex.get(resource.environment_id ?? -1);
  if (!env) {
    return resource;
  }
  return {
    ...resource,
    project_uuid: env.projectUuid,
    environment_uuid: env.uuid,
  };
}

/**
 * Fetches all resources and applies the shared filter/relationship logic:
 * filters on the RAW payload (preserving fields lost by normalization) and
 * only then normalizes. When a project/environment filter is used the results
 * are enriched with the resolved `project_uuid`/`environment_uuid`.
 */
export async function fetchFilteredResources(
  client: CoolifyClient,
  filters: ResourceQueryFilters = {},
): Promise<NormalizedResource[]> {
  const raw = await fetchAllResources(client);

  const needsIndex = Boolean(filters.project_uuid || filters.environment_uuid);
  const envIndex = needsIndex ? await resolveEnvironmentIndex(client) : undefined;

  const filtered = raw.filter((r) => matchesFilters(r, filters, envIndex));
  const enriched = envIndex ? filtered.map((r) => enrichResource(r, envIndex)) : filtered;
  return normalizeResources(enriched);
}

/**
 * Classifies a Coolify status string into the summary buckets used by
 * `project_overview`. Real statuses are compound strings (e.g. "running:healthy",
 * "exited:unhealthy"), so matching is prefix-based.
 */
export type ResourceSummaryStatus = 'running' | 'stopped' | 'degraded' | 'unknown';

export function classifyResourceStatus(status: string | undefined): ResourceSummaryStatus {
  const normalized = (status ?? '').toLowerCase();
  if (normalized.startsWith('running')) {
    return 'running';
  }
  if (normalized.startsWith('stopped')) {
    return 'stopped';
  }
  if (normalized.startsWith('degraded') || normalized.startsWith('exited')) {
    return 'degraded';
  }
  return 'unknown';
}
