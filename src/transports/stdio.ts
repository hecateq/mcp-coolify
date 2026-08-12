import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../observability/logger.js';

export async function startStdioTransport(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();

  logger.info('Starting Coolify MCP server in stdio mode');

  try {
    await server.connect(transport);
    logger.info('Coolify MCP server connected via stdio');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'Failed to start stdio transport');
    throw error;
  }
}
