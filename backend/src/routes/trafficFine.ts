import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { auditLogMiddleware } from '../middleware/auditLog';
import {
  addPaymentToTrafficFine,
  createTrafficFine,
  getTrafficFineById,
  listTrafficFines,
  validateTrafficFineInput,
  validateTrafficFinePaymentInput,
} from '../services/trafficFine.service';

export const trafficFineRouter = Router();

// All traffic fine routes require authentication
trafficFineRouter.use(authenticate);

/**
 * GET /api/traffic-fines
 * Optional query params: employeeId
 */
trafficFineRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = (req.query.employeeId as string | undefined) || undefined;
    const fines = await listTrafficFines(employeeId);
    res.json(fines);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/traffic-fines/:id
 */
trafficFineRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const fine = await getTrafficFineById(id);
    res.json(fine);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/traffic-fines
 */
trafficFineRouter.post('/', auditLogMiddleware('TRAFFIC_FINE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateTrafficFineInput(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Geçersiz veri', validation.errors);
    }

    const fine = await createTrafficFine(validation.data);
    req.auditLog = {
      entityType: 'TRAFFIC_FINE',
      entityId: fine.id,
      entityName: `${fine.employee.fullName} - Trafik Cezası`,
      newData: {
        employeeId: fine.employeeId,
        fineDate: fine.fineDate,
        amount: fine.amount,
        description: fine.description,
      },
    };
    res.status(201).json(fine);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/traffic-fines/:id/payments
 */
trafficFineRouter.post('/:id/payments', auditLogMiddleware('TRAFFIC_FINE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trafficFineId = req.params.id as string;
    const validation = validateTrafficFinePaymentInput(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Geçersiz veri', validation.errors);
    }

    const fine = await getTrafficFineById(trafficFineId);
    const payment = await addPaymentToTrafficFine(trafficFineId, validation.data);
    req.auditLog = {
      entityType: 'TRAFFIC_FINE',
      entityId: trafficFineId,
      entityName: `${fine.employee.fullName} - Trafik Cezası`,
      actionOverride: 'UPDATE',
      newData: {
        paymentDate: validation.data.paymentDate,
        amount: validation.data.amount,
      },
    };
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
});

