import { z } from 'zod';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export const createOvertimeEntrySchema = z.object({
  employeeId: z.string().min(1, 'Çalışan zorunludur'),
  entryDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Geçerli bir tarih giriniz',
  }),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  type: z.enum(['OVERTIME_50', 'OVERTIME_100']),
  multiplier: z.number().positive('Çarpan pozitif olmalıdır'),
  hours: z.number().positive('Saat 0\'dan büyük olmalıdır'),
  amount: z.number().positive('Tutar 0\'dan büyük olmalıdır'),
  description: z.string().max(100, 'Açıklama en fazla 100 karakter olabilir').optional().nullable(),
});

export type CreateOvertimeEntryInput = z.infer<typeof createOvertimeEntrySchema>;

export function validateCreateOvertimeEntryInput(
  input: unknown
): { success: true; data: CreateOvertimeEntryInput } | { success: false; errors: Record<string, string[]> } {
  const result = createOvertimeEntrySchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };

  const errors: Record<string, string[]> = {};
  for (const error of result.error.errors) {
    const field = error.path.join('.');
    if (!errors[field]) errors[field] = [];
    errors[field].push(error.message);
  }
  return { success: false, errors };
}

export async function listOvertimeEntries(month: number, year: number, employeeId?: string) {
  if (month < 1 || month > 12) {
    throw new AppError(400, 'INVALID_MONTH', 'Ay 1-12 arasında olmalıdır');
  }
  if (year < 2000 || year > 2100) {
    throw new AppError(400, 'INVALID_YEAR', 'Yıl 2000-2100 arasında olmalıdır');
  }

  return prisma.overtimeEntry.findMany({
    where: {
      month,
      year,
      ...(employeeId ? { employeeId } : {}),
    },
    orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      employee: true,
    },
  });
}

export async function createOvertimeEntry(input: CreateOvertimeEntryInput) {
  const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
  if (!employee) {
    throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Çalışan bulunamadı');
  }

  const payrollUpdateData =
    input.type === 'OVERTIME_50'
      ? { overtime50: { increment: input.amount } }
      : { overtime100: { increment: input.amount } };

  const [entry] = await prisma.$transaction([
    prisma.overtimeEntry.create({
      data: {
        employeeId: input.employeeId,
        entryDate: new Date(input.entryDate),
        month: input.month,
        year: input.year,
        type: input.type,
        multiplier: input.multiplier,
        hours: input.hours,
        amount: input.amount,
        description: input.description?.trim() || null,
      },
      include: { employee: true },
    }),
    prisma.payrollEntry.upsert({
      where: {
        employeeId_month_year: {
          employeeId: input.employeeId,
          month: input.month,
          year: input.year,
        },
      },
      update: payrollUpdateData,
      create: {
        employeeId: input.employeeId,
        month: input.month,
        year: input.year,
        sortOrder: 0,
        daysWorked: employee.workingDays,
        advance: 0,
        officialAdvance: 0,
        overtime50: input.type === 'OVERTIME_50' ? input.amount : 0,
        overtime100: input.type === 'OVERTIME_100' ? input.amount : 0,
        officialPayment: 0,
        cashPayment: 0,
      },
    }),
  ]);

  return entry;
}

export async function getOvertimeEntryById(id: string) {
  const entry = await prisma.overtimeEntry.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!entry) {
    throw new AppError(404, 'OVERTIME_NOT_FOUND', 'Mesai kaydı bulunamadı');
  }
  return entry;
}

export async function deleteOvertimeEntry(id: string) {
  const entry = await getOvertimeEntryById(id);
  const payrollUpdateData =
    entry.type === 'OVERTIME_50'
      ? { overtime50: { decrement: entry.amount } }
      : { overtime100: { decrement: entry.amount } };

  await prisma.$transaction([
    prisma.overtimeEntry.delete({ where: { id } }),
    prisma.payrollEntry.updateMany({
      where: {
        employeeId: entry.employeeId,
        month: entry.month,
        year: entry.year,
      },
      data: payrollUpdateData,
    }),
  ]);
}
