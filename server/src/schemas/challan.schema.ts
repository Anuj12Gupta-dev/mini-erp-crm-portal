import { z } from 'zod';
import { ChallanStatus } from '@prisma/client';

export const challanItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
});

export const createChallanSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(challanItemInputSchema).min(1),
});

export const updateChallanSchema = createChallanSchema.partial();

export const listChallansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  status: z.enum(ChallanStatus).optional(),
  customerId: z.string().optional(),
});
