import { z } from 'zod';

export const presignUploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().regex(/^image\//, 'Only image uploads are supported'),
});
