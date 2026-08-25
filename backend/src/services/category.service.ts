import { z } from 'zod';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

/**
 * Çalışma alanı (kategori) yönetimi.
 *
 * Employee.workArea, WorkAreaCategory.code değerini tutar. Bu ilişki bilerek
 * foreign key DEĞİLDİR: kategori silinse bile geçmiş çalışan kaydı bozulmaz.
 * Bunun karşılığı olarak, kullanımdaki bir kategorinin silinmesi engellenir.
 */

export const createCategorySchema = z.object({
  label: z.string().trim().min(1, 'Kategori adı zorunludur').max(50, 'Kategori adı en fazla 50 karakter olabilir'),
});

export const updateCategorySchema = z.object({
  label: z.string().trim().min(1, 'Kategori adı zorunludur').max(50, 'Kategori adı en fazla 50 karakter olabilir').optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const reorderCategoriesSchema = z.object({
  ids: z.array(z.string().uuid('Geçersiz kategori ID')).min(1, 'En az bir kategori gereklidir'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export interface CategoryResponse {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
  employeeCount: number;
}

// Türkçe harfleri kod üretiminde ASCII karşılığına çevirir
const TR_CHAR_MAP: Record<string, string> = {
  ç: 'C', Ç: 'C',
  ğ: 'G', Ğ: 'G',
  ı: 'I', İ: 'I', i: 'I',
  ö: 'O', Ö: 'O',
  ş: 'S', Ş: 'S',
  ü: 'U', Ü: 'U',
};

/**
 * Etiketten makine-okunur kod üretir: "Kayseri Yataş" -> "KAYSERI_YATAS"
 * Kod bir kez üretilir ve asla değişmez; etiket değişse bile çalışan
 * kayıtlarındaki workArea değeri geçerli kalır.
 */
function labelToCode(label: string): string {
  const ascii = label
    .trim()
    .split('')
    .map((ch) => TR_CHAR_MAP[ch] ?? ch)
    .join('');

  const code = ascii
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return code || 'KATEGORI';
}

async function makeUniqueCode(baseCode: string): Promise<string> {
  const existing = await prisma.workAreaCategory.findMany({
    where: { code: { startsWith: baseCode } },
    select: { code: true },
  });
  const taken = new Set(existing.map((c) => c.code));

  if (!taken.has(baseCode)) return baseCode;

  for (let i = 2; i < 1000; i++) {
    const candidate = `${baseCode}_${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new AppError(409, 'CODE_CONFLICT', 'Kategori kodu üretilemedi');
}

/** Kategori başına çalışan sayısını tek sorguda hesaplar */
async function getEmployeeCounts(): Promise<Map<string, number>> {
  const grouped = await prisma.employee.groupBy({
    by: ['workArea'],
    _count: { _all: true },
  });
  return new Map(grouped.map((g) => [g.workArea, g._count._all]));
}

export async function listCategories(): Promise<CategoryResponse[]> {
  const [categories, counts] = await Promise.all([
    prisma.workAreaCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    }),
    getEmployeeCounts(),
  ]);

  return categories.map((c) => ({
    id: c.id,
    code: c.code,
    label: c.label,
    sortOrder: c.sortOrder,
    employeeCount: counts.get(c.code) ?? 0,
  }));
}

/** Employee doğrulaması için geçerli kod listesi */
export async function getValidCategoryCodes(): Promise<string[]> {
  const categories = await prisma.workAreaCategory.findMany({ select: { code: true } });
  return categories.map((c) => c.code);
}

export async function createCategory(input: CreateCategoryInput): Promise<CategoryResponse> {
  const { label } = createCategorySchema.parse(input);

  const duplicate = await prisma.workAreaCategory.findFirst({
    where: { label: { equals: label, mode: 'insensitive' } },
  });
  if (duplicate) {
    throw new AppError(409, 'CATEGORY_EXISTS', `"${label}" adında bir kategori zaten var`);
  }

  const code = await makeUniqueCode(labelToCode(label));

  const last = await prisma.workAreaCategory.findFirst({
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const category = await prisma.workAreaCategory.create({
    data: {
      code,
      label,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  return { ...category, employeeCount: 0 };
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<CategoryResponse> {
  const existing = await prisma.workAreaCategory.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Kategori bulunamadı');
  }

  const data = updateCategorySchema.parse(input);

  if (data.label && data.label !== existing.label) {
    const duplicate = await prisma.workAreaCategory.findFirst({
      where: {
        label: { equals: data.label, mode: 'insensitive' },
        id: { not: id },
      },
    });
    if (duplicate) {
      throw new AppError(409, 'CATEGORY_EXISTS', `"${data.label}" adında bir kategori zaten var`);
    }
  }

  // code bilerek güncellenmez - çalışan kayıtları ona bağlı
  const category = await prisma.workAreaCategory.update({
    where: { id },
    data: {
      ...(data.label !== undefined ? { label: data.label } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });

  const counts = await getEmployeeCounts();
  return { ...category, employeeCount: counts.get(category.code) ?? 0 };
}

export async function deleteCategory(id: string): Promise<void> {
  const existing = await prisma.workAreaCategory.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Kategori bulunamadı');
  }

  const employeeCount = await prisma.employee.count({ where: { workArea: existing.code } });
  if (employeeCount > 0) {
    throw new AppError(
      409,
      'CATEGORY_IN_USE',
      `"${existing.label}" kategorisinde ${employeeCount} çalışan var. Silmeden önce bu çalışanları başka bir kategoriye taşıyın.`
    );
  }

  await prisma.workAreaCategory.delete({ where: { id } });
}

/** Verilen sıraya göre sortOrder'ları yeniden yazar */
export async function reorderCategories(ids: string[]): Promise<CategoryResponse[]> {
  const { ids: validIds } = reorderCategoriesSchema.parse({ ids });

  const existing = await prisma.workAreaCategory.findMany({
    where: { id: { in: validIds } },
    select: { id: true },
  });
  if (existing.length !== validIds.length) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Bir veya daha fazla kategori bulunamadı');
  }

  await prisma.$transaction(
    validIds.map((id, index) =>
      prisma.workAreaCategory.update({ where: { id }, data: { sortOrder: index } })
    )
  );

  return listCategories();
}

function zodErrorsToMap(result: z.SafeParseError<unknown>): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const error of result.error.errors) {
    const field = error.path.join('.');
    if (!errors[field]) errors[field] = [];
    errors[field].push(error.message);
  }
  return errors;
}

export function validateCreateCategoryInput(
  input: unknown
): { success: true; data: CreateCategoryInput } | { success: false; errors: Record<string, string[]> } {
  const result = createCategorySchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: zodErrorsToMap(result) };
}

export function validateUpdateCategoryInput(
  input: unknown
): { success: true; data: UpdateCategoryInput } | { success: false; errors: Record<string, string[]> } {
  const result = updateCategorySchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: zodErrorsToMap(result) };
}
