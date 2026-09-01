export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class InsufficientStockError extends Error {}

export function statusForError(err: unknown): number | null {
  if (err instanceof NotFoundError) return 404;
  if (err instanceof ConflictError) return 409;
  if (err instanceof InsufficientStockError) return 400;
  return null;
}
