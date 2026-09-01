import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `No route matches ${req.method} ${req.path}` });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Malformed JSON in request body' });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A record with these unique field(s) already exists' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Record not found' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(409).json({ error: 'This record is referenced by other records and cannot be modified' });
      return;
    }
  }

  // A RESTRICT violation raised directly by Postgres (rather than one Prisma recognizes and
  // codes as P2003) surfaces as PrismaClientUnknownRequestError with the raw DB message.
  if (
    err instanceof Prisma.PrismaClientUnknownRequestError &&
    /foreign key constraint/i.test(err.message)
  ) {
    res.status(409).json({ error: 'This record is referenced by other records and cannot be modified' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
