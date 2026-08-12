import { v4 as uuidv4 } from 'uuid';
import { loadConfig } from '../config/load-config.js';
import { logger } from '../observability/logger.js';
import { mapHttpStatusToError, CoolifyError } from './errors.js';
import { redactSecrets, redactAuthorizationHeader } from '../security/redaction.js';
import type { Config } from '../config/schema.js';
import type {
  CoolifyRequestOptions,
  CoolifyResponse,
  HttpMethod,
  CreateProjectBody,
  CreateApplicationBody,
  CreateServiceBody,
  CreateDatabaseBody,
  EnvVarEntry,
} from './types.js';

export class CoolifyClient {
  private readonly baseUrl: string;
  private readonly config: Config;
  private readonly defaultTimeout: number;

  constructor(config?: Config) {
    this.config = config ?? loadConfig();
    this.baseUrl = this.normalizeBaseUrl(this.config.coolifyUrl);
    this.defaultTimeout = 30000;
  }

  private normalizeBaseUrl(url: string): string {
    let normalized = url.replace(/\/+$/, '');
    if (!normalized.endsWith('/api/v1')) {
      normalized = `${normalized}/api/v1`;
    }
    return normalized;
  }

  private selectToken(permission?: 'read' | 'write' | 'deploy'): string {
    const c = this.config;

    switch (permission) {
      case 'deploy':
        return c.coolifyDeployToken || c.coolifyWriteToken || c.coolifyApiToken || '';
      case 'write':
        return c.coolifyWriteToken || c.coolifyApiToken || '';
      case 'read':
      default: {
        const sensitiveUrl = this.baseUrl.includes('envs') || this.baseUrl.includes('sensitive');
        if (sensitiveUrl) {
          return c.coolifySensitiveToken || c.coolifyReadToken || c.coolifyApiToken || '';
        }
        return c.coolifyReadToken || c.coolifyApiToken || '';
      }
    }
  }

  async request<T = unknown>(options: CoolifyRequestOptions): Promise<CoolifyResponse<T>> {
    const requestId = uuidv4();
    const startTime = Date.now();
    const { method, path, body, params, timeout, permission } = options;

    const token = this.selectToken(permission);
    if (!token) {
      throw new CoolifyError(
        'No Coolify API token configured — set COOLIFY_API_TOKEN or scoped tokens',
        'AUTHENTICATION_FAILED',
        401,
        false,
      );
    }

    let url = `${this.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const effectiveTimeout = timeout ?? this.defaultTimeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      logger.debug(
        { requestId, method, url: redactSecrets(url), hasBody: !!body },
        'Coolify API request',
      );

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      };

      if (body && method !== 'GET') {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody: T;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        responseBody = (await response.json()) as T;
      } else {
        responseBody = (await response.text()) as unknown as T;
      }

      const durationMs = Date.now() - startTime;

      const safeUrl = redactSecrets(url);

      logger.debug(
        {
          requestId,
          status: response.status,
          durationMs,
          url: safeUrl,
          headers: redactAuthorizationHeader(headers),
        },
        'Coolify API response',
      );

      if (!response.ok) {
        throw mapHttpStatusToError(response.status, responseBody);
      }

      return {
        data: responseBody,
        status: response.status,
        headers: responseHeaders,
      };
    } catch (error: unknown) {
      if (error instanceof CoolifyError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new CoolifyError(
          `Request timed out after ${effectiveTimeout}ms`,
          'REQUEST_TIMEOUT',
          0,
          true,
        );
      }

      throw new CoolifyError(
        error instanceof Error ? error.message : 'Unknown network error',
        'COOLIFY_UNAVAILABLE',
        0,
        true,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get<T = unknown>(path: string, params?: Record<string, string | number | undefined>): Promise<CoolifyResponse<T>> {
    return this.request<T>({ method: 'GET', path, params, permission: 'read' });
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<CoolifyResponse<T>> {
    return this.request<T>({ method: 'POST', path, body, permission: 'write' });
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<CoolifyResponse<T>> {
    return this.request<T>({ method: 'PATCH', path, body, permission: 'write' });
  }

  async deployRequest<T = unknown>(path: string, method: HttpMethod = 'GET'): Promise<CoolifyResponse<T>> {
    return this.request<T>({ method, path, permission: 'deploy' });
  }

  // ─── Health ───
  async health(): Promise<{ ok: boolean; latencyMs: number }> {
    const startTime = Date.now();
    try {
      const response = await this.get<{ ok?: boolean }>('/../health');
      return {
        ok: response.status === 200,
        latencyMs: Date.now() - startTime,
      };
    } catch {
      return {
        ok: false,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  // ─── Projects ───
  async listProjects(): Promise<CoolifyResponse<unknown[]>> {
    return this.get<unknown[]>('/projects');
  }

  async getProject(uuid: string): Promise<CoolifyResponse<unknown>> {
    return this.get<unknown>(`/projects/${uuid}`);
  }

  async getProjectEnvironments(uuid: string): Promise<CoolifyResponse<unknown[]>> {
    return this.get<unknown[]>(`/projects/${uuid}/environments`);
  }

  // ─── Resources ───
  async listResources(params?: Record<string, string | number | undefined>): Promise<CoolifyResponse<unknown[]>> {
    return this.get<unknown[]>('/resources', params);
  }

  // ─── Applications ───
  async getApplication(uuid: string): Promise<CoolifyResponse<unknown>> {
    return this.get<unknown>(`/applications/${uuid}`);
  }

  async getApplicationLogs(uuid: string, lines?: number): Promise<CoolifyResponse<unknown>> {
    return this.get<unknown>(`/applications/${uuid}/logs`, { lines: lines ?? this.config.logMaxLines });
  }

  async startApplication(uuid: string): Promise<CoolifyResponse<unknown>> {
    return this.post<unknown>(`/applications/${uuid}/start`);
  }

  async stopApplication(uuid: string): Promise<CoolifyResponse<unknown>> {
    return this.post<unknown>(`/applications/${uuid}/stop`);
  }

  async restartApplication(uuid: string): Promise<CoolifyResponse<unknown>> {
    return this.post<unknown>(`/applications/${uuid}/restart`);
  }

  // ─── Deploy ───
  async deployResource(uuid: string, resourceType: string): Promise<CoolifyResponse<unknown>> {
    const path = resourceType === 'application'
      ? `/deploy?uuid=${uuid}`
      : `/deploy?uuid=${uuid}&type=${resourceType}`;
    return this.deployRequest<unknown>(path, 'GET');
  }

  async deployResourceForce(uuid: string, resourceType: string): Promise<CoolifyResponse<unknown>> {
    return this.deployRequest<unknown>(`/deploy?uuid=${uuid}&type=${resourceType}`, 'POST');
  }

  async getDeployment(uuid: string): Promise<CoolifyResponse<unknown>> {
    return this.get<unknown>(`/deployments/${uuid}`);
  }

  async listDeployments(params?: Record<string, string | number | undefined>): Promise<CoolifyResponse<unknown[]>> {
    return this.get<unknown[]>('/deployments', params);
  }

  // ─── Projects (write) ───
  async createProject(body: CreateProjectBody): Promise<CoolifyResponse<unknown>> {
    return this.post<unknown>('/projects', body);
  }

  async createEnvironment(projectUuid: string, body: { name: string }): Promise<CoolifyResponse<unknown>> {
    return this.post<unknown>(`/projects/${projectUuid}/environments`, body);
  }

  // ─── Applications (write) ───
  async createApplication(body: CreateApplicationBody): Promise<CoolifyResponse<unknown>> {
    const sourceType = body.source_type ?? 'public';

    let path: string;
    switch (sourceType) {
      case 'private-github-app':
        path = '/applications/private-github-app';
        break;
      case 'private-deploy-key':
        path = '/applications/private-deploy-key';
        break;
      case 'dockerfile':
        path = '/applications/dockerfile';
        break;
      case 'dockerimage':
        path = '/applications/dockerimage';
        break;
      case 'public':
      default:
        path = '/applications/public';
        break;
    }

    return this.post<unknown>(path, body);
  }

  // ─── Services (write) ───
  async createService(body: CreateServiceBody): Promise<CoolifyResponse<unknown>> {
    return this.post<unknown>('/services', body);
  }

  async getService(uuid: string): Promise<CoolifyResponse<unknown>> {
    return this.get<unknown>(`/services/${uuid}`);
  }

  // ─── Databases (write) ───
  async createDatabase(type: string, body: CreateDatabaseBody): Promise<CoolifyResponse<unknown>> {
    return this.post<unknown>(`/databases/${type}`, body);
  }

  async getDatabase(uuid: string): Promise<CoolifyResponse<unknown>> {
    return this.get<unknown>(`/databases/${uuid}`);
  }

  // ─── Environment Variables ───
  async getApplicationEnvs(uuid: string): Promise<CoolifyResponse<unknown[]>> {
    return this.get<unknown[]>(`/applications/${uuid}/envs`);
  }

  async setApplicationEnvsBulk(uuid: string, envs: unknown): Promise<CoolifyResponse<unknown>> {
    return this.patch<unknown>(`/applications/${uuid}/envs/bulk`, envs);
  }

  async setEnvsBulk(uuid: string, resourceType: string, envs: EnvVarEntry[]): Promise<CoolifyResponse<unknown>> {
    let path: string;
    switch (resourceType) {
      case 'service':
        path = `/services/${uuid}/envs/bulk`;
        break;
      case 'database':
        path = `/databases/${uuid}/envs/bulk`;
        break;
      case 'application':
      default:
        path = `/applications/${uuid}/envs/bulk`;
        break;
    }
    return this.patch<unknown>(path, { envs });
  }

  async getServiceEnvs(uuid: string): Promise<CoolifyResponse<unknown[]>> {
    return this.get<unknown[]>(`/services/${uuid}/envs`);
  }

  async getDatabaseEnvs(uuid: string): Promise<CoolifyResponse<unknown[]>> {
    return this.get<unknown[]>(`/databases/${uuid}/envs`);
  }

  // ─── GitHub Discovery ───
  async listGithubApps(): Promise<CoolifyResponse<unknown[]>> {
    return this.get<unknown[]>('/github-apps');
  }

  async listGithubRepositories(githubAppUuid: string, search?: string, page?: number, limit?: number): Promise<CoolifyResponse<unknown[]>> {
    return this.get<unknown[]>(`/github-apps/${githubAppUuid}/repositories`, { search, page, limit });
  }

  async listGithubBranches(githubAppUuid: string, owner: string, repository: string): Promise<CoolifyResponse<unknown[]>> {
    return this.get<unknown[]>(`/github-apps/${githubAppUuid}/repositories/${owner}/${repository}/branches`);
  }

  // ─── Scheduled Tasks ───
  async listScheduledTasks(resourceUuid: string, resourceType?: string): Promise<CoolifyResponse<unknown[]>> {
    const prefix = resourceType === 'service' ? 'services' : 'applications';
    return this.get<unknown[]>(`/${prefix}/${resourceUuid}/scheduled-tasks`);
  }

  async getTaskExecutions(resourceUuid: string, taskUuid: string, resourceType?: string, status?: string, limit?: number): Promise<CoolifyResponse<unknown[]>> {
    const prefix = resourceType === 'service' ? 'services' : 'applications';
    return this.get<unknown[]>(`/${prefix}/${resourceUuid}/scheduled-tasks/${taskUuid}/executions`, { status, limit });
  }

  async createScheduledTask(resourceUuid: string, body: unknown, resourceType?: string): Promise<CoolifyResponse<unknown>> {
    const prefix = resourceType === 'service' ? 'services' : 'applications';
    return this.post<unknown>(`/${prefix}/${resourceUuid}/scheduled-tasks`, body);
  }

  async updateScheduledTask(resourceUuid: string, taskUuid: string, body: unknown, resourceType?: string): Promise<CoolifyResponse<unknown>> {
    const prefix = resourceType === 'service' ? 'services' : 'applications';
    return this.patch<unknown>(`/${prefix}/${resourceUuid}/scheduled-tasks/${taskUuid}`, body);
  }

  // ─── Deployment Cancel ───
  async cancelDeployment(deploymentUuid: string): Promise<CoolifyResponse<unknown>> {
    return this.post<unknown>(`/deployments/${deploymentUuid}/cancel`);
  }

  // ─── Database Backups ───
  async listDatabaseBackups(databaseUuid: string): Promise<CoolifyResponse<unknown[]>> {
    return this.get<unknown[]>(`/databases/${databaseUuid}/backups`);
  }

  async createBackupConfig(databaseUuid: string, body: unknown): Promise<CoolifyResponse<unknown>> {
    return this.post<unknown>(`/databases/${databaseUuid}/backups`, body);
  }

  // ─── Servers ───
  async listServers(): Promise<CoolifyResponse<unknown[]>> {
    return this.get<unknown[]>('/servers');
  }

  async getServer(uuid: string): Promise<CoolifyResponse<unknown>> {
    return this.get<unknown>(`/servers/${uuid}`);
  }

  async listServerResources(serverUuid: string, resourceType?: string, status?: string): Promise<CoolifyResponse<unknown[]>> {
    return this.get<unknown[]>(`/servers/${serverUuid}/resources`, { type: resourceType, status });
  }

  async validateServer(serverUuid: string): Promise<CoolifyResponse<unknown>> {
    return this.get<unknown>(`/servers/${serverUuid}/validate`);
  }

  async listServerDomains(serverUuid: string): Promise<CoolifyResponse<unknown[]>> {
    return this.get<unknown[]>(`/servers/${serverUuid}/domains`);
  }

  // ─── Teams ───
  async getCurrentTeam(): Promise<CoolifyResponse<unknown>> {
    return this.get<unknown>('/teams/current');
  }

  async listTeamMembers(): Promise<CoolifyResponse<unknown[]>> {
    return this.get<unknown[]>('/teams/current/members');
  }

  // ─── Configuration Updates ───
  async updateApplicationConfig(applicationUuid: string, body: unknown): Promise<CoolifyResponse<unknown>> {
    return this.patch<unknown>(`/applications/${applicationUuid}`, body);
  }

  async updateDatabaseConfig(databaseUuid: string, body: unknown): Promise<CoolifyResponse<unknown>> {
    return this.patch<unknown>(`/databases/${databaseUuid}`, body);
  }

  // ─── Storage ───
  async listStorages(resourceUuid: string, resourceType: string): Promise<CoolifyResponse<unknown[]>> {
    return this.get<unknown[]>(`/${resourceType}s/${resourceUuid}/storages`);
  }

  async createStorage(resourceUuid: string, resourceType: string, body: unknown): Promise<CoolifyResponse<unknown>> {
    return this.post<unknown>(`/${resourceType}s/${resourceUuid}/storages`, body);
  }
}

export const createCoolifyClient = (config?: Config): CoolifyClient => {
  return new CoolifyClient(config);
};

let defaultClient: CoolifyClient | null = null;

export function getCoolifyClient(): CoolifyClient {
  if (!defaultClient) {
    defaultClient = new CoolifyClient();
  }
  return defaultClient;
}
