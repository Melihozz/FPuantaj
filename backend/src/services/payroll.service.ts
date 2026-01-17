import { z } from 'zod';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { calculatePayroll, CalculationResult } from './calculation.service';

/**
 * Payroll Service
 * 
 * Puantaj kaydı CRUD fonksiyonları ve hesaplama servisi entegrasyonu.
 * Requirements: 4.1-4.6
 */

// Zod validation schemas
export const updatePayrollSchema = z.object({
  daysWorked: z.number().int().min(0, 'Çalıştığı gün sayısı negatif olamaz').max(31, 'Çalıştığı gün 0-31 arasında olmalıdır').optional(),
  advance: z.number().min(0, 'Avans negatif olamaz').optional(),
  officialAdvance: z.number().min(0, 'Resmi avans negatif olamaz').optional(),
  overtime50: z.number().min(0, '%50 mesai ücreti negatif olamaz').optional(),
  overtime100: z.number().min(0, '%100 mesai ücreti negatif olamaz').optional(),
  officialPayment: z.number().min(0, 'Resmi ödeme negatif olamaz').optional(),
  cashPayment: z.number().min(0, 'Elden ödeme negatif olamaz').optional(),
  sortOrder: z.number().int().min(0, 'Sıra negatif olamaz').optional(),
});

export const batchUpdateSchema = z.array(
  z.object({
    employeeId: z.string().uuid('Geçersiz çalışan ID'),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
    daysWorked: z.number().int().min(0).max(31).optional(),
    advance: z.number().min(0).optional(),
    officialAdvance: z.number().min(0).optional(),
    overtime50: z.number().min(0).optional(),
    overtime100: z.number().min(0).optional(),
    officialPayment: z.number().min(0).optional(),
    cashPayment: z.number().min(0).optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
);

export type UpdatePayrollInput = z.infer<typeof updatePayrollSchema>;
export type BatchUpdateInput = z.infer<typeof batchUpdateSchema>;

const FIXED_OFFICIAL_PAYMENT = 28075;
const OFFICIAL_WORKING_DAYS_BASE = 30;

// Payroll response type with calculated fields
export interface PayrollEntryResponse {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  sortOrder: number;
  daysWorked: number;
  advance: number;
  officialAdvance: number;
  overtime50: number;
  overtime100: number;
  officialPayment: number;
  cashPayment: number;
  // Calculated fields
  dailyWage: number;
  earnedSalary: number;
  totalReceivable: number;
  // Employee info
  employee: {
    id: string;
    fullName: string;
    workArea: string;
    isInsured: boolean;
    startDate: Date;
    endDate: Date | null;
    salary: number;
    workingDays: number;
  };
  createdAt: Date;
  updatedAt: Date;
}


/**
 * Calculate payroll fields for an entry
 */
function calculatePayrollFields(
  salary: number,
  workingDays: number,
  entry: {
    daysWorked: number;
    advance: number;
    officialAdvance: number;
    overtime50: number;
    overtime100: number;
    officialPayment: number;
    cashPayment: number;
  }
): CalculationResult {
  return calculatePayroll({
    salary,
    workingDays,
    daysWorked: entry.daysWorked,
    // total receivable should be reduced by both advances
    advance: entry.advance + entry.officialAdvance,
    overtime50: entry.overtime50,
    overtime100: entry.overtime100,
    officialPayment: entry.officialPayment,
    cashPayment: entry.cashPayment,
  });
}

function calculateOfficialAndCash(
  isInsured: boolean,
  salary: number,
  workingDays: number,
  daysWorked: number,
  overtime50: number,
  overtime100: number,
  cashAdvance: number,
  officialAdvance: number
): { officialPayment: number; cashPayment: number } {
  const dailyWage = salary / workingDays;
  const earnedSalary = dailyWage * daysWorked;
  const safeEarned = Math.max(0, earnedSalary);
  const safeOvertime50 = Math.max(0, overtime50);
  const safeOvertime100 = Math.max(0, overtime100);
  const safeCashAdvance = Math.max(0, cashAdvance);
  const safeOfficialAdvance = Math.max(0, officialAdvance);

  if (!isInsured) {
    const cashBase = safeEarned + safeOvertime50 + safeOvertime100;
    const cashPayment = Math.max(0, cashBase - Math.min(cashBase, safeCashAdvance));
    return { officialPayment: 0, cashPayment };
  }

  // Resmi baz: 28.075 TL, 30 güne bölünüp çalışılan gün kadar uygulanır
  const officialDaily = FIXED_OFFICIAL_PAYMENT / OFFICIAL_WORKING_DAYS_BASE;
  const officialBase = Math.min(safeEarned, Math.max(0, officialDaily * daysWorked));
  const cashBase = Math.max(0, safeEarned - officialBase) + safeOvertime50 + safeOvertime100;

  const officialPayment = Math.max(0, officialBase - Math.min(officialBase, safeOfficialAdvance));
  const cashPayment = Math.max(0, cashBase - Math.min(cashBase, safeCashAdvance));
  return { officialPayment, cashPayment };
}

/**
 * Transform database entry to response with calculated fields
 */
function transformToResponse(
  entry: {
    id: string;
    employeeId: string;
    month: number;
    year: number;
    sortOrder: number;
    daysWorked: number;
    advance: number;
    officialAdvance: number;
    overtime50: number;
    overtime100: number;
    officialPayment: number;
    cashPayment: number;
    createdAt: Date;
    updatedAt: Date;
    employee: {
      id: string;
      fullName: string;
      workArea: string;
      isInsured: boolean;
      startDate: Date;
      endDate: Date | null;
      salary: number;
      workingDays: number;
    };
  }
): PayrollEntryResponse {
  const split = calculateOfficialAndCash(
    entry.employee.isInsured,
    entry.employee.salary,
    entry.employee.workingDays,
    entry.daysWorked,
    entry.overtime50,
    entry.overtime100,
    entry.advance,
    entry.officialAdvance
  );

  const calculations = calculatePayrollFields(
    entry.employee.salary,
    entry.employee.workingDays,
    entry
  );

  return {
    id: entry.id,
    employeeId: entry.employeeId,
    month: entry.month,
    year: entry.year,
    sortOrder: entry.sortOrder,
    daysWorked: entry.daysWorked,
    advance: entry.advance,
    officialAdvance: entry.officialAdvance,
    overtime50: entry.overtime50,
    overtime100: entry.overtime100,
    officialPayment: split.officialPayment,
    cashPayment: split.cashPayment,
    dailyWage: calculations.dailyWage,
    earnedSalary: calculations.earnedSalary,
    totalReceivable: calculations.totalReceivable,
    employee: entry.employee,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

/**
 * Get payroll entries by month and year
 * Creates entries for employees that don't have one for the specified period
 * Filters out employees who left before the selected month
 * 
 * Requirements: 4.1-4.6
 */
export async function getPayrollByMonth(
  month: number,
  year: number
): Promise<PayrollEntryResponse[]> {
  // Validate month and year
  if (month < 1 || month > 12) {
    throw new AppError(400, 'INVALID_MONTH', 'Ay 1-12 arasında olmalıdır');
  }
  if (year < 2000 || year > 2100) {
    throw new AppError(400, 'INVALID_YEAR', 'Yıl 2000-2100 arasında olmalıdır');
  }

  // Get all employees
  const allEmployees = await prisma.employee.findMany({
    orderBy: { fullName: 'asc' },
  });

  // Filter out employees who left before the selected month
  // Employee should appear if: no endDate OR endDate is in the selected month or later
  const employees = allEmployees.filter((emp) => {
    if (!emp.endDate) return true; // No end date = still working
    
    const endDate = new Date(emp.endDate);
    const endMonth = endDate.getMonth() + 1; // 0-indexed to 1-indexed
    const endYear = endDate.getFullYear();
    
    // Include if end date is in selected month/year or later
    if (endYear > year) return true;
    if (endYear === year && endMonth >= month) return true;
    
    return false; // Employee left before this month
  });

  // Get existing payroll entries for this month/year
  const existingEntries = await prisma.payrollEntry.findMany({
    where: { month, year },
    include: {
      employee: true,
    },
  });

  // Create a map of existing entries by employeeId
  const existingMap = new Map(
    existingEntries.map((entry) => [entry.employeeId, entry])
  );

  // Create entries for employees that don't have one
  const entriesToCreate = employees
    .filter((emp) => !existingMap.has(emp.id))
    .map((emp) => ({
      employeeId: emp.id,
      month,
      year,
      sortOrder: 0,
      daysWorked: emp.workingDays,
      advance: 0,
      officialAdvance: 0,
      overtime50: 0,
      overtime100: 0,
      officialPayment: 0,
      cashPayment: 0,
    }));

  if (entriesToCreate.length > 0) {
    await prisma.payrollEntry.createMany({
      data: entriesToCreate,
    });
  }

  // Get active employee IDs for filtering
  const activeEmployeeIds = new Set(employees.map((emp) => emp.id));

  // Fetch all entries again with employee data
  const allEntries = await prisma.payrollEntry.findMany({
    where: { month, year },
    include: {
      employee: true,
    },
    orderBy: [
      { sortOrder: 'asc' },
      { employee: { fullName: 'asc' } },
    ],
  });

  // Filter to only include entries for active employees in this period
  const filteredEntries = allEntries.filter((entry) => 
    activeEmployeeIds.has(entry.employeeId)
  );

  return filteredEntries.map(transformToResponse);
}


/**
 * Get payroll entry by ID
 */
export async function getPayrollById(id: string): Promise<PayrollEntryResponse> {
  const entry = await prisma.payrollEntry.findUnique({
    where: { id },
    include: {
      employee: true,
    },
  });

  if (!entry) {
    throw new AppError(404, 'PAYROLL_NOT_FOUND', 'Puantaj kaydı bulunamadı');
  }

  return transformToResponse(entry);
}

/**
 * Update a payroll entry
 * 
 * Requirements: 4.1-4.6
 */
export async function updatePayroll(
  id: string,
  input: UpdatePayrollInput
): Promise<PayrollEntryResponse> {
  // Check if entry exists
  const existingEntry = await prisma.payrollEntry.findUnique({
    where: { id },
    include: { employee: true },
  });

  if (!existingEntry) {
    throw new AppError(404, 'PAYROLL_NOT_FOUND', 'Puantaj kaydı bulunamadı');
  }

  // Validate input
  const validatedData = updatePayrollSchema.parse(input);

  // Build update data
  const updateData: Record<string, number> = {};

  if (validatedData.daysWorked !== undefined) {
    updateData.daysWorked = validatedData.daysWorked;
  }
  if (validatedData.advance !== undefined) {
    updateData.advance = validatedData.advance;
  }
  if (validatedData.officialAdvance !== undefined) {
    updateData.officialAdvance = validatedData.officialAdvance;
  }
  if (validatedData.overtime50 !== undefined) {
    updateData.overtime50 = validatedData.overtime50;
  }
  if (validatedData.overtime100 !== undefined) {
    updateData.overtime100 = validatedData.overtime100;
  }
  if (validatedData.officialPayment !== undefined) {
    updateData.officialPayment = validatedData.officialPayment;
  }
  if (validatedData.cashPayment !== undefined) {
    updateData.cashPayment = validatedData.cashPayment;
  }
  if (validatedData.sortOrder !== undefined) {
    updateData.sortOrder = validatedData.sortOrder;
  }

  // Enforce automatic official/cash split (and officialAdvance only for insured employees)
  const nextDaysWorked = validatedData.daysWorked ?? existingEntry.daysWorked;
  const nextCashAdvanceRaw = validatedData.advance ?? existingEntry.advance;
  const nextOfficialAdvanceRaw = validatedData.officialAdvance ?? (existingEntry as { officialAdvance?: number }).officialAdvance ?? 0;
  const nextOvertime50 = validatedData.overtime50 ?? existingEntry.overtime50;
  const nextOvertime100 = validatedData.overtime100 ?? existingEntry.overtime100;

  const earned = Math.max(0, (existingEntry.employee.salary / existingEntry.employee.workingDays) * nextDaysWorked);
  const officialDaily = FIXED_OFFICIAL_PAYMENT / OFFICIAL_WORKING_DAYS_BASE;
  const baseOfficial = existingEntry.employee.isInsured
    ? Math.min(earned, Math.max(0, officialDaily * nextDaysWorked))
    : 0;
  const baseCash = Math.max(0, earned - baseOfficial) + Math.max(0, nextOvertime50) + Math.max(0, nextOvertime100);

  const nextCashAdvance = Math.min(Math.max(0, nextCashAdvanceRaw), baseCash);
  const nextOfficialAdvance = existingEntry.employee.isInsured
    ? Math.min(Math.max(0, nextOfficialAdvanceRaw), baseOfficial)
    : 0;

  updateData.advance = nextCashAdvance;
  updateData.officialAdvance = nextOfficialAdvance;

  const split = calculateOfficialAndCash(
    existingEntry.employee.isInsured,
    existingEntry.employee.salary,
    existingEntry.employee.workingDays,
    nextDaysWorked,
    nextOvertime50,
    nextOvertime100,
    nextCashAdvance,
    nextOfficialAdvance
  );
  updateData.officialPayment = split.officialPayment;
  updateData.cashPayment = split.cashPayment;

  const updatedEntry = await prisma.payrollEntry.update({
    where: { id },
    data: updateData,
    include: {
      employee: true,
    },
  });

  return transformToResponse(updatedEntry);
}

/**
 * Batch update payroll entries
 * Creates or updates entries for the specified employees and period
 * 
 * Requirements: 4.1-4.6
 */
export async function batchUpdatePayroll(
  entries: BatchUpdateInput
): Promise<PayrollEntryResponse[]> {
  // Validate input
  const validatedData = batchUpdateSchema.parse(entries);

  const results: PayrollEntryResponse[] = [];

  for (const entry of validatedData) {
    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: entry.employeeId },
    });

    if (!employee) {
      throw new AppError(404, 'EMPLOYEE_NOT_FOUND', `Çalışan bulunamadı: ${entry.employeeId}`);
    }

    const shouldRecalculateSplit =
      entry.daysWorked !== undefined ||
      entry.advance !== undefined ||
      entry.officialAdvance !== undefined;

    const existing = shouldRecalculateSplit
      ? await prisma.payrollEntry.findUnique({
          where: {
            employeeId_month_year: {
              employeeId: entry.employeeId,
              month: entry.month,
              year: entry.year,
            },
          },
        })
      : null;

    const nextDaysWorked = entry.daysWorked ?? existing?.daysWorked ?? 0;
    const nextOvertime50 = entry.overtime50 ?? existing?.overtime50 ?? 0;
    const nextOvertime100 = entry.overtime100 ?? existing?.overtime100 ?? 0;
    const earned = Math.max(0, (employee.salary / employee.workingDays) * nextDaysWorked);
    const officialDaily = FIXED_OFFICIAL_PAYMENT / OFFICIAL_WORKING_DAYS_BASE;
    const baseOfficial = employee.isInsured
      ? Math.min(earned, Math.max(0, officialDaily * nextDaysWorked))
      : 0;
    const baseCash = Math.max(0, earned - baseOfficial) + Math.max(0, nextOvertime50) + Math.max(0, nextOvertime100);

    const nextCashAdvance = Math.min(
      Math.max(0, entry.advance ?? existing?.advance ?? 0),
      baseCash
    );
    const nextOfficialAdvance = employee.isInsured
      ? Math.min(
          Math.max(0, entry.officialAdvance ?? (existing as { officialAdvance?: number } | null)?.officialAdvance ?? 0),
          baseOfficial
        )
      : 0;

    const split = shouldRecalculateSplit
      ? calculateOfficialAndCash(
          employee.isInsured,
          employee.salary,
          employee.workingDays,
          nextDaysWorked,
          nextOvertime50,
          nextOvertime100,
          nextCashAdvance,
          nextOfficialAdvance
        )
      : null;

    const upsertedEntry = await prisma.payrollEntry.upsert({
      where: {
        employeeId_month_year: {
          employeeId: entry.employeeId,
          month: entry.month,
          year: entry.year,
        },
      },
      update: {
        daysWorked: entry.daysWorked ?? undefined,
        advance: entry.advance !== undefined ? nextCashAdvance : undefined,
        officialAdvance: entry.officialAdvance !== undefined ? nextOfficialAdvance : undefined,
        overtime50: entry.overtime50 ?? undefined,
        overtime100: entry.overtime100 ?? undefined,
        // official/cash are automatic; set when any split-driving field changes
        officialPayment: shouldRecalculateSplit ? (split?.officialPayment ?? undefined) : undefined,
        cashPayment: shouldRecalculateSplit ? (split?.cashPayment ?? undefined) : undefined,
        sortOrder: entry.sortOrder ?? undefined,
      },
      create: {
        employeeId: entry.employeeId,
        month: entry.month,
        year: entry.year,
        daysWorked: nextDaysWorked,
        advance: nextCashAdvance,
        officialAdvance: nextOfficialAdvance,
        overtime50: entry.overtime50 ?? 0,
        overtime100: entry.overtime100 ?? 0,
        officialPayment: split?.officialPayment ?? 0,
        cashPayment: split?.cashPayment ?? 0,
        sortOrder: entry.sortOrder ?? 0,
      },
      include: {
        employee: true,
      },
    });

    results.push(transformToResponse(upsertedEntry));
  }

  return results;
}

/**
 * Validate payroll input and return validation errors if any
 */
export function validatePayrollInput(
  input: unknown
): { success: true; data: UpdatePayrollInput } | { success: false; errors: Record<string, string[]> } {
  const result = updatePayrollSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transform Zod errors to our format
  const errors: Record<string, string[]> = {};
  for (const error of result.error.errors) {
    const field = error.path.join('.');
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field].push(error.message);
  }

  return { success: false, errors };
}

/**
 * Validate batch update input
 */
export function validateBatchInput(
  input: unknown
): { success: true; data: BatchUpdateInput } | { success: false; errors: Record<string, string[]> } {
  const result = batchUpdateSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Transform Zod errors to our format
  const errors: Record<string, string[]> = {};
  for (const error of result.error.errors) {
    const field = error.path.join('.');
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field].push(error.message);
  }

  return { success: false, errors };
}
