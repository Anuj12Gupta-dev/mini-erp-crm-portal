import { z } from 'zod';
import { StockMovementType } from '@prisma/client';

export const createStockMovementSchema = z.object({
  quantity: z.coerce.number().int().positive(),
  type: z.enum(StockMovementType),
  reason: z.string().min(1),
});

export const listStockMovementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  productId: z.string().optional(),
});
