import type { FastifyInstance } from 'fastify';
import { overviewRoutes } from './overview.js';
import { searchRoutes } from './search.js';
import { projectsRoutes } from './projects.js';
import { resourcesRoutes } from './resources.js';
import { deploymentsRoutes } from './deployments.js';
import { scheduledTasksRoutes } from './scheduled-tasks.js';
import { backupsRoutes } from './backups.js';
import { serversRoutes } from './servers.js';
import { teamsRoutes } from './teams.js';
import { toolsRoutes } from './tools.js';
import { auditRoutes } from './audit.js';

export async function registerApiRoutes(app: FastifyInstance): Promise<void> {
  await overviewRoutes(app);
  await searchRoutes(app);
  await projectsRoutes(app);
  await resourcesRoutes(app);
  await deploymentsRoutes(app);
  await scheduledTasksRoutes(app);
  await backupsRoutes(app);
  await serversRoutes(app);
  await teamsRoutes(app);
  await toolsRoutes(app);
  await auditRoutes(app);
}
