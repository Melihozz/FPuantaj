import { z } from 'zod';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

// Valid work areas
export const WorkArea = {
  DEPO: 'DEPO',
  URETIM: 'URETIM',
  OFIS: 'OFIS',
  SAHA_ELEMANI: 'SAHA_ELEMANI',
  KAYSERI_YATAS: 'KAYSERI_YATAS',
  ANKARA_YATAS: 'ANKARA_YATAS',
  ISTANBUL_YATAS: 'ISTANBUL_YATAS',
  DIGER: 'DIGER',
} as const;

export type WorkAreaType = (typeof WorkArea)[keyof typeof WorkArea];

// Zod validation schemas
export const createEmployeeSchema = z.object({
  fullName: z.string().min(1, 'Ad soyad zorunludur').max(255, 'Ad soyad çok uzun'),
  workArea: z.enum(['DEPO', 'URETIM', 'OFIS', 'SAHA_ELEMANI', 'KAYSERI_YATAS', 'ANKARA_YATAS', 'ISTANBUL_YATAS', 'DIGER'], {
    errorMap: () => ({ message: 'Geçersiz çalışma alanı' }),
  }),
  isInsured: z.boolean().default(false),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Geçerli bir tarih giriniz',
  }),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Geçerli bir tarih giriniz',
    })
    .optional()
    .nullable(),
  salary: z.number().positive('Maaş pozitif bir sayı olmalıdır'),
  workingDays: z.number().int().min(1).max(31).default(30),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

// Employee response type
export interface EmployeeResponse {
  id: string;
  fullName: string;
  workArea: string;
  isInsured: boolean;
  startDate: Date;
  endDate: Date | null;
  salary: number;
  workingDays: number;
  createdAt: Date;
  updatedAt: Date;
}


/**
 * Get all employees
 */
export async function getAllEmployees(): Promise<EmployeeResponse[]> {
  const employees = await prisma.employee.findMany({
    orderBy: { fullName: 'asc' },
  });
  return employees;
}

/**
 * Get employee by ID
 */
export async function getEmployeeById(id: string): Promise<EmployeeResponse> {
  const employee = await prisma.employee.findUnique({
    where: { id },
  });

  if (!employee) {
    throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Çalışan bulunamadı');
  }

  return employee;
}

/**
 * Create a new employee
 */
export async function createEmployee(input: CreateEmployeeInput): Promise<EmployeeResponse> {
  // Validate input
  const validatedData = createEmployeeSchema.parse(input);

  const employee = await prisma.employee.create({
    data: {
      fullName: validatedData.fullName,
      workArea: validatedData.workArea,
      isInsured: validatedData.isInsured,
      startDate: new Date(validatedData.startDate),
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
      salary: validatedData.salary,
      workingDays: validatedData.workingDays,
    },
  });

  return employee;
}

/**
 * Update an existing employee
 */
export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput
): Promise<EmployeeResponse> {
  // Check if employee exists
  const existingEmployee = await prisma.employee.findUnique({
    where: { id },
  });

  if (!existingEmployee) {
    throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Çalışan bulunamadı');
  }

  // Validate input
  const validatedData = updateEmployeeSchema.parse(input);

  // Build update data
  const updateData: Record<string, unknown> = {};

  if (validatedData.fullName !== undefined) {
    updateData.fullName = validatedData.fullName;
  }
  if (validatedData.workArea !== undefined) {
    updateData.workArea = validatedData.workArea;
  }
  if (validatedData.isInsured !== undefined) {
    updateData.isInsured = validatedData.isInsured;
  }
  if (validatedData.startDate !== undefined) {
    updateData.startDate = new Date(validatedData.startDate);
  }
  if (validatedData.endDate !== undefined) {
    updateData.endDate = validatedData.endDate ? new Date(validatedData.endDate) : null;
  }
  if (validatedData.salary !== undefined) {
    updateData.salary = validatedData.salary;
  }
  if (validatedData.workingDays !== undefined) {
    updateData.workingDays = validatedData.workingDays;
  }

  const employee = await prisma.employee.update({
    where: { id },
    data: updateData,
  });

  return employee;
}

/**
 * Delete an employee
 */
export async function deleteEmployee(id: string): Promise<void> {
  // Check if employee exists
  const existingEmployee = await prisma.employee.findUnique({
    where: { id },
  });

  if (!existingEmployee) {
    throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Çalışan bulunamadı');
  }

  await prisma.employee.delete({
    where: { id },
  });
}

/**
 * Validate employee input and return validation errors if any
 */
export function validateEmployeeInput(
  input: unknown,
  isUpdate: boolean = false
): { success: true; data: CreateEmployeeInput | UpdateEmployeeInput } | { success: false; errors: Record<string, string[]> } {
  const schema = isUpdate ? updateEmployeeSchema : createEmployeeSchema;
  const result = schema.safeParse(input);

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
