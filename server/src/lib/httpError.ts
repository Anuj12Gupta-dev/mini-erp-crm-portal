import { Response } from 'express';
import { ZodError } from 'zod';

export function sendValidationError(res: Response, error: ZodError, message = 'Validation failed'): void {
  res.status(400).json({
    error: message,
    details: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  });
}
