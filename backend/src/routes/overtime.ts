import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { auditLogMiddleware, captureOldData } from '../middleware/auditLog';
import prisma from '../utils/prisma';
import {
  createOvertimeEntry,
  deleteOvertimeEntry,
  getOvertimeEntryById,
  listOvertimeEntries,
  validateCreateOvertimeEntryInput,
} from '../services/overtime.service';

export const overtimeRouter = Router();

overtimeRouter.use(authenticate);

const getOvertimeOldData = async (req: Request) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const entry = await prisma.overtimeEntry.findUnique({
    where: { id },
    include: {
      employee: true,
    },
  });
  return entry as Record<string, unknown> | null;
};

overtimeRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const month = parseInt(req.query.month as string, 10);
    const year = parseInt(req.query.year as string, 10);
    const employeeId = (req.query.employeeId as string | undefined) || undefined;

    if (isNaN(month) || isNaN(year)) {
      throw new AppError(400, 'INVALID_PARAMS', 'Ay ve yıl parametreleri gereklidir');
    }

    const entries = await listOvertimeEntries(month, year, employeeId);
    res.json(entries);
  } catch (error) {
    next(error);
  }
});

overtimeRouter.post('/', auditLogMiddleware('PAYROLL'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateCreateOvertimeEntryInput(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Geçersiz veri', validation.errors);
    }

    const entry = await createOvertimeEntry(validation.data);
    req.auditLog = {
      entityType: 'PAYROLL',
      entityId: entry.id,
      entityName: `${entry.employee.fullName} - Mesai`,
      actionOverride: 'UPDATE',
      newData: {
        employeeId: entry.employeeId,
        month: entry.month,
        year: entry.year,
        type: entry.type,
        multiplier: entry.multiplier,
        hours: entry.hours,
        amount: entry.amount,
        description: entry.description,
      },
    };
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

overtimeRouter.delete(
  '/:id',
  captureOldData('PAYROLL', getOvertimeOldData),
  auditLogMiddleware('PAYROLL'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const entry = await getOvertimeEntryById(id);
      await deleteOvertimeEntry(id);
      req.auditLog = {
        entityType: 'PAYROLL',
        entityId: id,
        entityName: `${entry.employee.fullName} - Mesai`,
        actionOverride: 'DELETE',
        oldData: {
          employeeId: entry.employeeId,
          month: entry.month,
          year: entry.year,
          type: entry.type,
          amount: entry.amount,
          hours: entry.hours,
          description: entry.description,
        },
      };
      res.status(204).json({ deleted: true });
    } catch (error) {
      next(error);
    }
  }
);
