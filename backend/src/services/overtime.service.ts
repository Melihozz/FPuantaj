import { z } from 'zod';
import { Prisma, Employee } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { calculateOfficialAndCash } from './payroll.service';

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

export const bulkCreateOvertimeSchema = z
  .array(createOvertimeEntrySchema)
  .min(1, 'En az bir mesai kaydı gereklidir')
  .max(200, 'Tek seferde en fazla 200 mesai kaydı eklenebilir');

export type BulkCreateOvertimeInput = z.infer<typeof bulkCreateOvertimeSchema>;

function zodErrorsToMap(result: z.SafeParseError<unknown>): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const error of result.error.errors) {
    const field = error.path.join('.');
    if (!errors[field]) errors[field] = [];
    errors[field].push(error.message);
  }
  return errors;
}

export function validateCreateOvertimeEntryInput(
  input: unknown
): { success: true; data: CreateOvertimeEntryInput } | { success: false; errors: Record<string, string[]> } {
  const result = createOvertimeEntrySchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: zodErrorsToMap(result) };
}

export function validateBulkCreateOvertimeInput(
  input: unknown
): { success: true; data: BulkCreateOvertimeInput } | { success: false; errors: Record<string, string[]> } {
  const result = bulkCreateOvertimeSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: zodErrorsToMap(result) };
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

/**
 * Tek bir mesai kaydını transaction içinde oluşturur ve payroll'u günceller.
 *
 * Hem tekli hem toplu ekleme BU fonksiyondan geçer - hesaplama yolunun
 * tek olması, iki akışın asla farklı sonuç üretmemesini garanti eder.
 * Aynı çalışana ait ardışık kayıtlarda ikinci okuma, transaction içindeki
 * ilk yazımı görür; mesailer doğru birikir.
 */
async function createEntryInTx(
  tx: Prisma.TransactionClient,
  employee: Employee,
  input: CreateOvertimeEntryInput
) {
  {
    const entry = await tx.overtimeEntry.create({
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
    });

    const existing = await tx.payrollEntry.findUnique({
      where: {
        employeeId_month_year: {
          employeeId: input.employeeId,
          month: input.month,
          year: input.year,
        },
      },
    });

    const delta50 = input.type === 'OVERTIME_50' ? input.amount : 0;
    const delta100 = input.type === 'OVERTIME_100' ? input.amount : 0;

    const nextOvertime50 = (existing?.overtime50 ?? 0) + delta50;
    const nextOvertime100 = (existing?.overtime100 ?? 0) + delta100;
    const daysWorked = existing?.daysWorked ?? employee.workingDays;
    const advance = existing?.advance ?? 0;
    const officialAdvance = existing?.officialAdvance ?? 0;

    // Mesai elden ödeme tabanını büyütür; dağılımı yeniden hesapla ki
    // kayıtlı officialPayment/cashPayment kolonları bayat kalmasın.
    const split = calculateOfficialAndCash(
      employee.isInsured,
      employee.salary,
      employee.workingDays,
      daysWorked,
      nextOvertime50,
      nextOvertime100,
      advance,
      officialAdvance
    );

    await tx.payrollEntry.upsert({
      where: {
        employeeId_month_year: {
          employeeId: input.employeeId,
          month: input.month,
          year: input.year,
        },
      },
      update: {
        overtime50: nextOvertime50,
        overtime100: nextOvertime100,
        officialPayment: split.officialPayment,
        cashPayment: split.cashPayment,
      },
      create: {
        employeeId: input.employeeId,
        month: input.month,
        year: input.year,
        sortOrder: 0,
        daysWorked,
        advance: 0,
        officialAdvance: 0,
        overtime50: nextOvertime50,
        overtime100: nextOvertime100,
        officialPayment: split.officialPayment,
        cashPayment: split.cashPayment,
      },
    });

    return entry;
  }
}

export async function createOvertimeEntry(input: CreateOvertimeEntryInput) {
  const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
  if (!employee) {
    throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Çalışan bulunamadı');
  }

  return prisma.$transaction((tx) => createEntryInTx(tx, employee, input));
}

/**
 * Toplu mesai ekleme: tüm kayıtlar TEK transaction'da işlenir.
 * Biri hata verirse hiçbiri yazılmaz (kısmi kayıt kalmaz).
 * Her satır tekli eklemeyle aynı createEntryInTx yolundan geçer;
 * aynı çalışana hem %50 hem %100 satırı sorunsuz birikir.
 */
export async function createOvertimeEntriesBulk(inputs: BulkCreateOvertimeInput) {
  const employeeIds = Array.from(new Set(inputs.map((i) => i.employeeId)));
  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
  });
  const employeeMap = new Map(employees.map((emp) => [emp.id, emp]));

  for (const input of inputs) {
    if (!employeeMap.has(input.employeeId)) {
      throw new AppError(404, 'EMPLOYEE_NOT_FOUND', `Çalışan bulunamadı: ${input.employeeId}`);
    }
  }

  return prisma.$transaction(
    async (tx) => {
      const results = [];
      for (const input of inputs) {
        results.push(await createEntryInTx(tx, employeeMap.get(input.employeeId)!, input));
      }
      return results;
    },
    // Çok satırlı ekleme varsayılan 5sn'yi aşabilir
    { timeout: 20000 }
  );
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

  await prisma.$transaction(async (tx) => {
    await tx.overtimeEntry.delete({ where: { id } });

    const existing = await tx.payrollEntry.findUnique({
      where: {
        employeeId_month_year: {
          employeeId: entry.employeeId,
          month: entry.month,
          year: entry.year,
        },
      },
    });

    // Puantaj kaydı yoksa düşülecek bir şey de yok
    if (!existing) {
      return;
    }

    const delta50 = entry.type === 'OVERTIME_50' ? entry.amount : 0;
    const delta100 = entry.type === 'OVERTIME_100' ? entry.amount : 0;

    const nextOvertime50 = existing.overtime50 - delta50;
    const nextOvertime100 = existing.overtime100 - delta100;

    const split = calculateOfficialAndCash(
      entry.employee.isInsured,
      entry.employee.salary,
      entry.employee.workingDays,
      existing.daysWorked,
      nextOvertime50,
      nextOvertime100,
      existing.advance,
      existing.officialAdvance
    );

    await tx.payrollEntry.update({
      where: { id: existing.id },
      data: {
        overtime50: nextOvertime50,
        overtime100: nextOvertime100,
        officialPayment: split.officialPayment,
        cashPayment: split.cashPayment,
      },
    });
  });
}
