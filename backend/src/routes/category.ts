import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { auditLogMiddleware, captureOldData } from '../middleware/auditLog';
import prisma from '../utils/prisma';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  validateCreateCategoryInput,
  validateUpdateCategoryInput,
} from '../services/category.service';

export const categoryRouter = Router();

categoryRouter.use(authenticate);

const getCategoryOldData = async (req: Request) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const category = await prisma.workAreaCategory.findUnique({ where: { id } });
  return category as Record<string, unknown> | null;
};

/** GET /api/categories */
categoryRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listCategories());
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/categories/reorder
 * NOT: '/:id' rotalarından ÖNCE tanımlanmalı, aksi halde "reorder" bir id sanılır.
 */
categoryRouter.post('/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ids = (req.body as { ids?: unknown })?.ids;
    if (!Array.isArray(ids)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'ids dizisi gereklidir');
    }
    res.json(await reorderCategories(ids as string[]));
  } catch (error) {
    next(error);
  }
});

/** POST /api/categories */
categoryRouter.post('/', auditLogMiddleware('CATEGORY'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateCreateCategoryInput(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Geçersiz veri', validation.errors);
    }

    const category = await createCategory(validation.data);
    req.auditLog = {
      entityType: 'CATEGORY',
      entityId: category.id,
      entityName: category.label,
      newData: { code: category.code, label: category.label },
    };
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

/** PUT /api/categories/:id */
categoryRouter.put(
  '/:id',
  captureOldData('CATEGORY', getCategoryOldData),
  auditLogMiddleware('CATEGORY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateUpdateCategoryInput(req.body);
      if (!validation.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Geçersiz veri', validation.errors);
      }

      const category = await updateCategory(req.params.id as string, validation.data);
      res.json(category);
    } catch (error) {
      next(error);
    }
  }
);

/** DELETE /api/categories/:id */
categoryRouter.delete(
  '/:id',
  captureOldData('CATEGORY', getCategoryOldData),
  auditLogMiddleware('CATEGORY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteCategory(req.params.id as string);
      res.status(204).json({ deleted: true });
    } catch (error) {
      next(error);
    }
  }
);
