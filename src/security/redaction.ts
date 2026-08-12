const SECRET_KEYWORDS = [
  'authorization',
  'token',
  'apikey',
  'api_key',
  'api-key',
  'secret',
  'password',
  'private_key',
  'private-key',
  'access_token',
  'access-token',
  'refresh_token',
  'refresh-token',
  'cookie',
  'database_url',
  'database-url',
  'DATABASE_URL',
];

function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  // Split by common delimiters and check each part
  const parts = lowerKey.split(/[_\-.]+/);
  // Check the whole key, individual parts, and combined consecutive parts
  const candidates: string[] = [lowerKey, ...parts];
  // Also check consecutive 2-part and 3-part combinations (e.g. "api" + "key" = "apikey")
  for (let i = 0; i < parts.length - 1; i++) {
    candidates.push(parts.slice(i, i + 2).join(''));
    if (i < parts.length - 2) {
      candidates.push(parts.slice(i, i + 3).join(''));
    }
  }
  return SECRET_KEYWORDS.some((kw) => candidates.includes(kw.toLowerCase()));
}

const BEARER_PATTERN = /Bearer\s+[^\s"',;]+/gi;
const SENSITIVE_VALUE_PATTERN =
  /(["']?\s*(?:password|secret|token|api[_-]?key|apikey)\s*["']?\s*[:=]\s*)["'][^"']+["']/gi;

export function redactSecrets(text: string): string {
  let result = text;

  result = result.replace(BEARER_PATTERN, 'Bearer [REDACTED]');
  result = result.replace(SENSITIVE_VALUE_PATTERN, (_full, prefix: string) => {
    return `${prefix}"[REDACTED]"`;
  });

  return result;
}

export function redactAuthorizationHeader(headers: Record<string, string>): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'authorization') {
      redacted[key] = value.replace(BEARER_PATTERN, 'Bearer [REDACTED]');
    } else if (isSensitiveKey(lowerKey)) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export function redactEnvValue(key: string, value: string): string {
  if (isSensitiveKey(key)) {
    return '[REDACTED]';
  }
  return redactSecrets(value);
}

export function isSecretField(fieldName: string): boolean {
  return isSensitiveKey(fieldName);
}

export function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSecretField(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      result[key] = redactSecrets(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
