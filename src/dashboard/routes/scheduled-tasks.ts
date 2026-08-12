import type { FastifyInstance } from 'fastify';
import { getCoolifyClient } from '../../coolify/client.js';
import {
  normalizeScheduledTasks,
  normalizeTaskExecutions,
} from '../../coolify/normalizers.js';
import type {
  CoolifyScheduledTask,
  CoolifyTaskExecution,
  CoolifyResource,
} from '../../coolify/types.js';
import { logger } from '../../observability/logger.js';

export async function scheduledTasksRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get<{
    Querystring: { resource_uuid?: string; status?: string };
  }>('/api/scheduled-tasks', async (request, reply) => {
    try {
      const client = getCoolifyClient();

      if (request.query.resource_uuid) {
        const res = await client.listScheduledTasks(
          request.query.resource_uuid,
        );
        let tasks = normalizeScheduledTasks(
          (res.data || []) as CoolifyScheduledTask[],
        );
        if (request.query.status) {
          tasks = tasks.filter(
            (t) => t.last_execution_status === request.query.status,
          );
        }
        return reply.send({ ok: true, data: tasks });
      }

      // Iterate over all applications and services to collect tasks
      const resourcesRes = await client.listResources();
      const resources = (resourcesRes.data || []) as CoolifyResource[];
      const allTasks: CoolifyScheduledTask[] = [];

      for (const resource of resources) {
        if (
          resource.type !== 'application' &&
          resource.type !== 'service'
        ) {
          continue;
        }
        try {
          const taskRes = await client.listScheduledTasks(
            resource.uuid,
            resource.type,
          );
          const tasks = (taskRes.data || []) as CoolifyScheduledTask[];
          allTasks.push(
            ...tasks.map((t) => ({
              ...t,
              resource_uuid: resource.uuid,
            })),
          );
        } catch {
          // Some resources may not support scheduled tasks
        }
      }

      let normalizedTasks = normalizeScheduledTasks(allTasks);
      if (request.query.status) {
        normalizedTasks = normalizedTasks.filter(
          (t) => t.last_execution_status === request.query.status,
        );
      }

      return reply.send({ ok: true, data: normalizedTasks });
    } catch (error) {
      logger.error(
        { error: (error as Error).message },
        'Dashboard: scheduled tasks error',
      );
      return reply.status(500).send({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list scheduled tasks',
        },
      });
    }
  });

  app.get<{ Params: { task_uuid: string }; Querystring: { resource_uuid?: string; resource_type?: string } }>(
    '/api/scheduled-tasks/:task_uuid/executions',
    async (request, reply) => {
      try {
        const client = getCoolifyClient();
        const { task_uuid } = request.params;
        const resourceUuid = request.query.resource_uuid;

        if (!resourceUuid) {
          return reply.status(400).send({
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'resource_uuid query parameter is required',
            },
          });
        }

        const res = await client.getTaskExecutions(
          resourceUuid,
          task_uuid,
          request.query.resource_type,
        );
        const executions = normalizeTaskExecutions(
          (res.data || []) as CoolifyTaskExecution[],
        );

        return reply.send({ ok: true, data: executions });
      } catch (error) {
        logger.error(
          { error: (error as Error).message },
          'Dashboard: task executions error',
        );
        return reply.status(500).send({
          ok: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get task executions',
          },
        });
      }
    },
  );
}
