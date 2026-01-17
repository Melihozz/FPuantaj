import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

/**
 * Log Service
 * 
 * Audit log oluşturma, değişiklik hesaplama ve sorgulama fonksiyonları.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

// Types
export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityType = 'EMPLOYEE' | 'PAYROLL';

export interface FieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface AuditLogResponse {
  id: string;
  userId: string;
  userName: string;
  action: ActionType;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  changes: FieldChange[];
  timestamp: Date;
}

export interface CreateLogInput {
  userId: string;
  userName: string;
  action: ActionType;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}

export interface PaginatedLogsResponse {
  logs: AuditLogResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}


/**
 * Compute changes between old and new data
 * 
 * Requirements: 6.2 - değişen alanları eski ve yeni değerleri ile kaydetmeli
 */
export function computeChanges(
  oldData?: Record<string, unknown>,
  newData?: Record<string, unknown>
): FieldChange[] {
  const changes: FieldChange[] = [];

  // CREATE: tüm yeni alanlar
  if (!oldData && newData) {
    for (const [field, value] of Object.entries(newData)) {
      // Skip internal fields
      if (field === 'id' || field === 'createdAt' || field === 'updatedAt') continue;
      changes.push({
        field,
        oldValue: null,
        newValue: formatValue(value),
      });
    }
    return changes;
  }

  // DELETE: tüm eski alanlar
  if (oldData && !newData) {
    for (const [field, value] of Object.entries(oldData)) {
      // Skip internal fields
      if (field === 'id' || field === 'createdAt' || field === 'updatedAt') continue;
      changes.push({
        field,
        oldValue: formatValue(value),
        newValue: null,
      });
    }
    return changes;
  }

  // UPDATE: değişen alanlar
  if (oldData && newData) {
    const allFields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    for (const field of allFields) {
      // Skip internal fields
      if (field === 'id' || field === 'createdAt' || field === 'updatedAt') continue;
      
      const oldValue = oldData[field];
      const newValue = newData[field];
      
      // Only record if values are different
      if (!isEqual(oldValue, newValue)) {
        changes.push({
          field,
          oldValue: formatValue(oldValue),
          newValue: formatValue(newValue),
        });
      }
    }
  }

  return changes;
}

/**
 * Format a value for storage in the log
 */
function formatValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Check if two values are equal
 */
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;
  
  // Handle Date comparison
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  
  // Handle object comparison
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  
  return false;
}


/**
 * Create an audit log entry
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export async function createAuditLog(input: CreateLogInput): Promise<AuditLogResponse> {
  const changes = computeChanges(input.oldData, input.newData);
  
  const log = await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityName: input.entityName,
      changes: JSON.stringify(changes),
    },
    include: {
      user: {
        select: {
          username: true,
        },
      },
    },
  });

  return {
    id: log.id,
    userId: log.userId,
    userName: log.user.username,
    action: log.action as ActionType,
    entityType: log.entityType as EntityType,
    entityId: log.entityId,
    entityName: log.entityName,
    changes: JSON.parse(log.changes) as FieldChange[],
    timestamp: log.timestamp,
  };
}

/**
 * Get all audit logs with pagination
 * 
 * Requirements: 7.1, 7.2
 */
export async function getAllLogs(
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedLogsResponse> {
  // Validate pagination params
  if (page < 1) page = 1;
  if (pageSize < 1) pageSize = 20;
  if (pageSize > 100) pageSize = 100;

  const skip = (page - 1) * pageSize;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip,
      take: pageSize,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    }),
    prisma.auditLog.count(),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user.username,
      action: log.action as ActionType,
      entityType: log.entityType as EntityType,
      entityId: log.entityId,
      entityName: log.entityName,
      changes: JSON.parse(log.changes) as FieldChange[],
      timestamp: log.timestamp,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get audit logs for a specific entity
 * 
 * Requirements: 7.2
 */
export async function getLogsByEntityId(entityId: string): Promise<AuditLogResponse[]> {
  const logs = await prisma.auditLog.findMany({
    where: { entityId },
    orderBy: { timestamp: 'desc' },
    include: {
      user: {
        select: {
          username: true,
        },
      },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    userId: log.userId,
    userName: log.user.username,
    action: log.action as ActionType,
    entityType: log.entityType as EntityType,
    entityId: log.entityId,
    entityName: log.entityName,
    changes: JSON.parse(log.changes) as FieldChange[],
    timestamp: log.timestamp,
  }));
}

/**
 * Serialize an AuditLog to JSON string
 * 
 * Requirements: 6.7
 */
export function serializeLog(log: AuditLogResponse): string {
  return JSON.stringify({
    ...log,
    timestamp: log.timestamp.toISOString(),
  });
}

/**
 * Deserialize a JSON string to AuditLog
 * 
 * Requirements: 6.7
 */
export function deserializeLog(json: string): AuditLogResponse {
  const parsed = JSON.parse(json);
  return {
    ...parsed,
    timestamp: new Date(parsed.timestamp),
  };
}
