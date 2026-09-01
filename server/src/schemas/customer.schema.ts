import { z } from 'zod';
import { CustomerType, CustomerStatus } from '@prisma/client';

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().min(1),
  email: z.string().email().optional(),
  businessName: z.string().optional(),
  gst: z.string().optional(),
  type: z.enum(CustomerType),
  address: z.string().optional(),
  status: z.enum(CustomerStatus).optional(),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  status: z.enum(CustomerStatus).optional(),
  type: z.enum(CustomerType).optional(),
});
