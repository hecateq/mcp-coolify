import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import express, { type Request, type Response, type NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { loadConfig } from '../config/load-config.js';
import { getCoolifyClient } from '../coolify/client.js';
import { logger } from '../observability/logger.js';

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return timingSafeEqual(aBuf, bBuf);
}

function createAuthMiddleware(apiKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ ok: false, error: { code: 'AUTHENTICATION_FAILED', message: 'Missing or invalid Authorization header' } });
      return;
    }

    const token = authHeader.slice(7);
    if (!timingSafeCompare(token, apiKey)) {
      res.status(401).json({ ok: false, error: { code: 'AUTHENTICATION_FAILED', message: 'Invalid API key' } });
      return;
    }

    next();
  };
}

export async function startHttpTransport(server: McpServer): Promise<void> {
  const config = loadConfig();

  if (!config.serverApiKey) {
    throw new Error(
      'MCP_SERVER_API_KEY is required for HTTP transport mode. ' +
        'Generate a strong random key and set it in your environment.',
    );
  }

  const app = express();
  app.use(express.json());

  // Liveness check — no auth required
  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ ok: true, status: 'alive' });
  });

  // Readiness check — verifies Coolify API reachable
  app.get('/readyz', async (_req: Request, res: Response) => {
    try {
      const client = getCoolifyClient();
      const health = await client.health();
      if (health.ok) {
        res.status(200).json({ ok: true, status: 'ready', coolify: 'reachable' });
      } else {
        res.status(503).json({ ok: false, status: 'not ready', coolify: 'unreachable' });
      }
    } catch {
      res.status(503).json({ ok: false, status: 'not ready', coolify: 'unreachable' });
    }
  });

  // MCP endpoint — requires auth
  const mcpRouter = express.Router();
  mcpRouter.use(createAuthMiddleware(config.serverApiKey));

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  mcpRouter.post('/mcp', async (req: Request, res: Response) => {
    try {
      await transport.handleRequest(req, res, req.body);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Internal error';
      logger.error({ error: message }, 'MCP request handling error');
      if (!res.headersSent) {
        res.status(500).json({
          ok: false,
          error: { code: 'INTERNAL_ERROR', message: 'MCP request processing failed' },
        });
      }
    }
  });

  app.use(mcpRouter);

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ error: err.message }, 'Unhandled error in HTTP transport');
    if (!res.headersSent) {
      res.status(500).json({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
    }
  });

  await server.connect(transport);

  const host = config.httpHost;
  const port = config.httpPort;

  return new Promise<void>((resolve, reject) => {
    const httpServer = app.listen(port, host, () => {
      logger.info(`Coolify MCP server listening on http://${host}:${port} (HTTP transport)`);
      logger.info(`  Health:  http://${host}:${port}/healthz`);
      logger.info(`  Ready:   http://${host}:${port}/readyz`);
      logger.info(`  MCP:     http://${host}:${port}/mcp  (Authorization required)`);
      resolve();
    });

    httpServer.on('error', (err: Error) => {
      logger.error({ error: err.message }, 'Failed to start HTTP server');
      reject(err);
    });
  });
}
