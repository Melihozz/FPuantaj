import { z } from 'zod';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export const createTrafficFineSchema = z.object({
  employeeId: z.string().min(1, 'Çalışan zorunludur'),
  fineDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Geçerli bir tarih giriniz',
  }),
  amount: z.number().positive('Tutar pozitif bir sayı olmalıdır'),
  description: z.string().max(500, 'Açıklama çok uzun').optional().nullable(),
});

export type CreateTrafficFineInput = z.infer<typeof createTrafficFineSchema>;

export const createTrafficFinePaymentSchema = z.object({
  paymentDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Geçerli bir tarih giriniz',
  }),
  amount: z.number().positive('Tutar pozitif bir sayı olmalıdır'),
});

export type CreateTrafficFinePaymentInput = z.infer<typeof createTrafficFinePaymentSchema>;

export function validateTrafficFineInput(
  input: unknown
): { success: true; data: CreateTrafficFineInput } | { success: false; errors: Record<string, string[]> } {
  const result = createTrafficFineSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };

  const errors: Record<string, string[]> = {};
  for (const error of result.error.errors) {
    const field = error.path.join('.');
    if (!errors[field]) errors[field] = [];
    errors[field].push(error.message);
  }
  return { success: false, errors };
}

export function validateTrafficFinePaymentInput(
  input: unknown
): { success: true; data: CreateTrafficFinePaymentInput } | { success: false; errors: Record<string, string[]> } {
  const result = createTrafficFinePaymentSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };

  const errors: Record<string, string[]> = {};
  for (const error of result.error.errors) {
    const field = error.path.join('.');
    if (!errors[field]) errors[field] = [];
    errors[field].push(error.message);
  }
  return { success: false, errors };
}

export async function listTrafficFines(employeeId?: string) {
  const fines = await prisma.trafficFine.findMany({
    where: employeeId ? { employeeId } : undefined,
    orderBy: [{ fineDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      employee: true,
      payments: { orderBy: { paymentDate: 'desc' } },
    },
  });
  return fines;
}

export async function getTrafficFineById(id: string) {
  const fine = await prisma.trafficFine.findUnique({
    where: { id },
    include: {
      employee: true,
      payments: { orderBy: { paymentDate: 'desc' } },
    },
  });
  if (!fine) {
    throw new AppError(404, 'TRAFFIC_FINE_NOT_FOUND', 'Trafik cezası bulunamadı');
  }
  return fine;
}

export async function createTrafficFine(input: CreateTrafficFineInput) {
  const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
  if (!employee) {
    throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Çalışan bulunamadı');
  }

  const fine = await prisma.trafficFine.create({
    data: {
      employeeId: input.employeeId,
      fineDate: new Date(input.fineDate),
      amount: input.amount,
      description: input.description ?? null,
    },
    include: {
      employee: true,
      payments: { orderBy: { paymentDate: 'desc' } },
    },
  });

  return fine;
}

export async function addPaymentToTrafficFine(trafficFineId: string, input: CreateTrafficFinePaymentInput) {
  // Ensure traffic fine exists
  await getTrafficFineById(trafficFineId);

  const payment = await prisma.trafficFinePayment.create({
    data: {
      trafficFineId,
      paymentDate: new Date(input.paymentDate),
      amount: input.amount,
    },
  });

  return payment;
}

export async function deleteTrafficFine(id: string): Promise<void> {
  // Ensure traffic fine exists
  await getTrafficFineById(id);

  await prisma.trafficFine.delete({
    where: { id },
  });
}

