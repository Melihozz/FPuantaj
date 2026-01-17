import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { getAllLogs, getLogsByEntityId } from '../services/log.service';

/**
 * Log Routes
 * 
 * Audit log görüntüleme API endpoints.
 * Requirements: 7.1, 7.2
 */

export const logRouter = Router();

// All log routes require authentication
logRouter.use(authenticate);

/**
 * GET /api/logs
 * Get all audit logs with pagination
 * Query params: page (default 1), pageSize (default 20, max 100)
 * 
 * Requirements: 7.1, 7.2
 */
logRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 20;

    const result = await getAllLogs(page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/logs/:entityId
 * Get audit logs for a specific entity
 * 
 * Requirements: 7.2
 */
logRouter.get('/:entityId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityId = req.params.entityId as string;
    const logs = await getLogsByEntityId(entityId);
    res.json(logs);
  } catch (error) {
    next(error);
  }
});
