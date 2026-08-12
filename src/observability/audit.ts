import { logger } from './logger.js';
import { v4 as uuidv4 } from 'uuid';

export interface AuditEvent {
  event: string;
  requestId: string;
  resourceUuid?: string;
  resourceType?: string;
  projectUuid?: string;
  environmentUuid?: string;
  operation?: string;
  result: 'allowed' | 'denied' | 'error';
  reason?: string;
  timestamp: string;
  durationMs?: number;
}

const auditBuffer: AuditEvent[] = [];
const MAX_BUFFER_SIZE = 1000;

export function getAuditEvents(filters?: {
  action?: string;
  resource?: string;
  project?: string;
  result?: string;
  limit?: number;
}): AuditEvent[] {
  let events = [...auditBuffer];
  if (filters?.action) {
    const action = filters.action.toLowerCase();
    events = events.filter((e) => e.event?.toLowerCase().includes(action));
  }
  if (filters?.resource) {
    events = events.filter((e) => e.resourceUuid === filters.resource);
  }
  if (filters?.project) {
    events = events.filter((e) => e.projectUuid === filters.project);
  }
  if (filters?.result) {
    events = events.filter((e) => e.result === filters.result);
  }
  return events.slice(0, filters?.limit ?? 100);
}

export function createAuditEvent(
  partial: Omit<AuditEvent, 'requestId' | 'timestamp' | 'result'> & { result?: AuditEvent['result'] },
): AuditEvent {
  return {
    requestId: uuidv4(),
    timestamp: new Date().toISOString(),
    result: 'allowed',
    ...partial,
  };
}

export function logAudit(event: AuditEvent): void {
  // Store in circular buffer
  auditBuffer.unshift(event);
  if (auditBuffer.length > MAX_BUFFER_SIZE) {
    auditBuffer.pop();
  }

  const { event: eventType, result, ...rest } = event;

  if (result === 'error') {
    logger.error({ audit: { event: eventType, result, ...rest } }, `AUDIT: ${eventType}`);
  } else if (result === 'denied') {
    logger.warn({ audit: { event: eventType, result, ...rest } }, `AUDIT: ${eventType}`);
  } else {
    logger.info({ audit: { event: eventType, result, ...rest } }, `AUDIT: ${eventType}`);
  }
}

export function logMutationAudit(
  toolName: string,
  resourceUuid: string,
  resourceType: string,
  result: AuditEvent['result'],
  reason?: string,
  meta?: { projectUuid?: string; environmentUuid?: string },
): AuditEvent {
  const event = createAuditEvent({
    event: `coolify.${toolName}`,
    resourceUuid,
    resourceType,
    operation: toolName,
    result,
    reason,
    projectUuid: meta?.projectUuid,
    environmentUuid: meta?.environmentUuid,
  });
  logAudit(event);
  return event;
}
