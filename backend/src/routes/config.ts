import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import {
  FIXED_OFFICIAL_PAYMENT,
  OFFICIAL_WORKING_DAYS_BASE,
} from '../config/payroll.config';

export const configRouter = Router();

configRouter.use(authenticate);

/**
 * GET /api/config/payroll
 * Frontend'in hesaplama sabitlerini backend ile aynı tutması için.
 */
configRouter.get('/payroll', (_req: Request, res: Response) => {
  res.json({
    officialWageBase: FIXED_OFFICIAL_PAYMENT,
    officialWorkingDaysBase: OFFICIAL_WORKING_DAYS_BASE,
  });
});
