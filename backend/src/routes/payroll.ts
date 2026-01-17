import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { auditLogMiddleware, captureOldData } from '../middleware/auditLog';
import prisma from '../utils/prisma';
import {
  getPayrollByMonth,
  getPayrollById,
  updatePayroll,
  batchUpdatePayroll,
  validatePayrollInput,
  validateBatchInput,
} from '../services/payroll.service';

export const payrollRouter = Router();

// All payroll routes require authentication
payrollRouter.use(authenticate);

// Helper to get payroll data for audit log
const getPayrollOldData = async (req: Request) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const entry = await prisma.payrollEntry.findUnique({
    where: { id },
    include: { employee: true },
  });
  return entry as Record<string, unknown> | null;
};

/**
 * GET /api/payroll
 * Get payroll entries by month and year
 * Query params: month (1-12), year (2000-2100)
 * 
 * Requirements: 4.1-4.6
 */
payrollRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const month = parseInt(req.query.month as string, 10);
    const year = parseInt(req.query.year as string, 10);

    if (isNaN(month) || isNaN(year)) {
      throw new AppError(400, 'INVALID_PARAMS', 'Ay ve yıl parametreleri gereklidir');
    }

    const entries = await getPayrollByMonth(month, year);
    res.json(entries);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payroll/:id
 * Get payroll entry by ID
 */
payrollRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const entry = await getPayrollById(id);
    res.json(entry);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/payroll/:id
 * Update a payroll entry
 * 
 * Requirements: 4.1-4.7
 */
payrollRouter.put(
  '/:id',
  captureOldData('PAYROLL', getPayrollOldData),
  auditLogMiddleware('PAYROLL'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;

      // Validate input
      const validation = validatePayrollInput(req.body);
      if (!validation.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Geçersiz veri', validation.errors);
      }

      const entry = await updatePayroll(id, validation.data);
      res.json(entry);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/payroll/batch
 * Batch update payroll entries
 * 
 * Requirements: 4.1-4.7
 */
payrollRouter.post('/batch', auditLogMiddleware('PAYROLL'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const validation = validateBatchInput(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Geçersiz veri', validation.errors);
    }

    // Batch updates should be logged as UPDATE with a period-based label
    const first = validation.data[0];
    if (first) {
      const { month, year } = first;
      const fieldsUpdated = Array.from(
        new Set(
          validation.data
            .flatMap((e) => Object.keys(e))
            .filter((k) => !['employeeId', 'month', 'year'].includes(k))
        )
      );

      req.auditLog = {
        entityType: 'PAYROLL',
        entityId: `BATCH_${year}_${month}`,
        entityName: `Puantaj - ${month}/${year} (Toplu)`,
        actionOverride: 'UPDATE',
        newData: {
          month,
          year,
          updatedCount: validation.data.length,
          fieldsUpdated,
        },
      };
    }

    const entries = await batchUpdatePayroll(validation.data);
    res.json(entries);
  } catch (error) {
    next(error);
  }
});
