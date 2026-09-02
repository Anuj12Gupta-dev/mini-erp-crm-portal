import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional(),
  unitPrice: z.coerce.number().nonnegative(),
  minStockQty: z.coerce.number().int().nonnegative().optional().default(0),
  location: z.string().optional(),
  imageUrl: z.string().url().optional(),
  openingStock: z.coerce.number().int().nonnegative().optional().default(0),
});

export const updateProductSchema = createProductSchema.partial();

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  category: z.string().optional(),
  lowStock: z.coerce.boolean().optional(),
});
