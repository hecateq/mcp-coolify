#!/usr/bin/env node

import 'dotenv/config';

import { createServer } from './server/create-server.js';
import { startStdioTransport } from './transports/stdio.js';
import { startHttpTransport } from './transports/http.js';
import { loadConfig } from './config/load-config.js';
import { logger } from './observability/logger.js';
import { startDashboard } from './dashboard/server.js';

async function main(): Promise<void> {
  try {
    const config = loadConfig();
    logger.info(
      {
        transport: config.transport,
        operationMode: config.operationMode,
        coolifyUrl: config.coolifyUrl,
        hasToken: !!(config.coolifyApiToken || config.coolifyReadToken),
      },
      'Starting Coolify MCP Server',
    );

    const server = createServer();

    if (config.dashboardEnabled) {
      startDashboard().catch((error) => {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        logger.error(
          { error: message },
          'Dashboard startup failed (MCP continues)',
        );
      });
    }

    if (config.transport === 'http') {
      await startHttpTransport(server);
    } else {
      await startStdioTransport(server);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'Failed to start Coolify MCP Server');
    process.exit(1);
  }
}

main();
