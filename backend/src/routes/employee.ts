import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { auditLogMiddleware, captureOldData } from '../middleware/auditLog';
import prisma from '../utils/prisma';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  validateEmployeeInput,
} from '../services/employee.service';

export const employeeRouter = Router();

// All employee routes require authentication
employeeRouter.use(authenticate);

// Helper to get employee data for audit log
const getEmployeeOldData = async (req: Request) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const employee = await prisma.employee.findUnique({
    where: { id },
  });
  return employee as Record<string, unknown> | null;
};

/**
 * GET /api/employees
 * Get all employees
 */
employeeRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employees = await getAllEmployees();
    res.json(employees);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/employees/:id
 * Get employee by ID
 */
employeeRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const employee = await getEmployeeById(id);
    res.json(employee);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/employees
 * Create a new employee
 */
employeeRouter.post('/', auditLogMiddleware('EMPLOYEE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const validation = validateEmployeeInput(req.body, false);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Geçersiz veri', validation.errors);
    }

    const employee = await createEmployee(validation.data as Parameters<typeof createEmployee>[0]);
    res.status(201).json(employee);
  } catch (error) {
    next(error);
  }
});


/**
 * PUT /api/employees/:id
 * Update an existing employee
 */
employeeRouter.put(
  '/:id',
  captureOldData('EMPLOYEE', getEmployeeOldData),
  auditLogMiddleware('EMPLOYEE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;

      // Validate input
      const validation = validateEmployeeInput(req.body, true);
      if (!validation.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Geçersiz veri', validation.errors);
      }

      const employee = await updateEmployee(id, validation.data);
      res.json(employee);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/employees/:id
 * Delete an employee
 */
employeeRouter.delete(
  '/:id',
  captureOldData('EMPLOYEE', getEmployeeOldData),
  auditLogMiddleware('EMPLOYEE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      await deleteEmployee(id);
      res.status(204).json({ deleted: true });
    } catch (error) {
      next(error);
    }
  }
);
