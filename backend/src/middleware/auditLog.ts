import { Request, Response, NextFunction } from 'express';
import { createAuditLog, ActionType, EntityType } from '../services/log.service';

/**
 * Audit Log Middleware
 * 
 * Employee ve Payroll işlemlerini otomatik olarak loglar.
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

// Extend Express Request to include audit log data
declare global {
  namespace Express {
    interface Request {
      auditLog?: {
        entityType: EntityType;
        entityId?: string;
        entityName?: string;
        actionOverride?: ActionType;
        oldData?: Record<string, unknown>;
        newData?: Record<string, unknown>;
      };
    }
  }
}

/**
 * Determine action type from HTTP method
 */
function getActionFromMethod(method: string): ActionType | null {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return null;
  }
}

/**
 * Create audit log after response is sent
 */
export function auditLogMiddleware(entityType: EntityType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to capture response
    res.json = function(body: unknown) {
      // Only log for successful mutations
      const auditData = req.auditLog;
      const action = auditData?.actionOverride || getActionFromMethod(req.method);
      if (!action) {
        return originalJson(body);
      }

      // Skip if no user (shouldn't happen with auth middleware)
      const user = (req as Request & { user?: { userId: string; username: string } }).user;
      if (!user) {
        return originalJson(body);
      }

      // Skip if response is an error
      if (res.statusCode >= 400) {
        return originalJson(body);
      }

      // Determine entity info from response or request
      let entityId: string;
      let entityName: string;
      let newData: Record<string, unknown> | undefined;

      const paramId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (action === 'DELETE') {
        entityId = auditData?.entityId || paramId || '';
        entityName = auditData?.entityName || 'Unknown';
        newData = undefined;
      } else {
        // Some endpoints (e.g. batch updates) return arrays, so we can't infer name/id from body
        const isArrayBody = Array.isArray(body);
        const responseBody = (!isArrayBody && body && typeof body === 'object')
          ? (body as Record<string, unknown>)
          : undefined;

        entityId = (responseBody?.id as string) || auditData?.entityId || paramId || '';

        const nameFromBody = responseBody ? getEntityName(entityType, responseBody) : '';
        entityName = (isArrayBody ? '' : nameFromBody) || auditData?.entityName || 'Unknown';

        // Prefer explicit newData when provided (useful for batch endpoints to avoid huge logs)
        newData = (auditData?.newData || responseBody) as Record<string, unknown> | undefined;
      }

      // Create audit log asynchronously (don't block response)
      createAuditLog({
        userId: user.userId,
        userName: user.username,
        action,
        entityType,
        entityId,
        entityName,
        oldData: auditData?.oldData,
        newData,
      }).catch((err) => {
        console.error('Failed to create audit log:', err);
      });

      return originalJson(body);
    };

    next();
  };
}

/**
 * Get entity name based on entity type
 */
function getEntityName(entityType: EntityType, data: Record<string, unknown>): string {
  if (entityType === 'EMPLOYEE') {
    return (data?.fullName as string) || 'Unknown Employee';
  }
  if (entityType === 'PAYROLL') {
    const employee = data?.employee as Record<string, unknown>;
    const month = data?.month;
    const year = data?.year;
    const employeeName = employee?.fullName || 'Unknown';
    return `${employeeName} - ${month}/${year}`;
  }
  return 'Unknown';
}


/**
 * Middleware to capture old data before update/delete operations
 * Should be used before the actual route handler
 */
export function captureOldData(
  entityType: EntityType,
  getOldData: (req: Request) => Promise<Record<string, unknown> | null>
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    // Only capture for UPDATE and DELETE operations
    const action = getActionFromMethod(req.method);
    if (action !== 'UPDATE' && action !== 'DELETE') {
      return next();
    }

    const paramId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    try {
      const oldData = await getOldData(req);
      if (oldData) {
        req.auditLog = {
          entityType,
          entityId: paramId,
          entityName: getEntityName(entityType, oldData),
          oldData,
        };
      }
    } catch (err) {
      // Don't fail the request if we can't get old data
      console.error('Failed to capture old data for audit log:', err);
    }

    next();
  };
}
