import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import path from 'node:path';
import { loadConfig } from '../config/load-config.js';
import { logger } from '../observability/logger.js';
import { registerApiRoutes } from './routes/index.js';

export async function startDashboard(): Promise<void> {
  const config = loadConfig();

  if (!config.dashboardEnabled) {
    logger.info('Dashboard: disabled by configuration');
    return;
  }

  const app = Fastify({
    logger: false,
  });

  await app.register(fastifyCors, {
    origin: true,
  });

  const staticPath = path.join(process.cwd(), 'dist', 'dashboard');
  await app.register(fastifyStatic, {
    root: staticPath,
    prefix: '/',
    decorateReply: true,
  });

  app.get('/healthz', async () => ({
    ok: true,
    status: 'alive',
  }));

  await registerApiRoutes(app);

  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.status(404).send({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'API endpoint not found' },
      });
    }
    return reply.sendFile('index.html');
  });

  try {
    const host = config.dashboardHost;
    const port = config.dashboardPort;
    await app.listen({ host, port });
    logger.info(`Dashboard: http://${host}:${port}`);
    logger.info(`Dashboard health: http://${host}:${port}/healthz`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { error: message },
      'Dashboard: failed to start (MCP continues)',
    );
  }
}
