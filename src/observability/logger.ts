import pino from 'pino';

const isStdioTransport = process.env['MCP_TRANSPORT'] !== 'http';

export const logger = pino({
  level: process.env['LOG_LEVEL'] || 'info',
  ...(isStdioTransport && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: false,
        destination: 2,
        sync: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: '[{requestId}] {msg}',
      },
    },
  }),
  // In stdio mode, MUST write to stderr — stdout is for MCP protocol
  ...(isStdioTransport ? {} : {}),
  // Strip potentially sensitive fields
  serializers: {
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: [
      'authorization',
      'token',
      'apiKey',
      'api_key',
      'apikey',
      'secret',
      'password',
      'privateKey',
      'private_key',
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
      'cookie',
      'databaseUrl',
      'database_url',
      'DATABASE_URL',
      'body.authorization',
      'body.token',
      'body.password',
      'headers.authorization',
      'headers.cookie',
    ],
    censor: '[REDACTED]',
  },
});

export type Logger = typeof logger;
