import { z } from 'zod';

export const createFollowUpSchema = z.object({
  note: z.string().min(1),
  followUpAt: z.coerce.date().optional(),
});
