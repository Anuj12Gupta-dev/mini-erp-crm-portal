import { Request, Response } from 'express';
import { prisma } from '../prisma';
import {
  createStockMovementSchema,
  listStockMovementsQuerySchema,
} from '../schemas/stockMovement.schema';
import { NotFoundError, InsufficientStockError, statusForError } from '../lib/errors';
import { sendValidationError } from '../lib/httpError';

export async function listStockMovements(req: Request, res: Response): Promise<void> {
  const parsed = listStockMovementsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }
  const { page, pageSize, productId } = parsed.data;

  const where = productId ? { productId } : {};

  const [total, movements] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
  ]);

  res.json({ data: movements, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
}

export async function createStockMovement(
  req: Request<{ productId: string }>,
  res: Response,
): Promise<void> {
  const parsed = createStockMovementSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }
  const { quantity, type, reason } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: req.params.productId } });
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Decrement is a single conditional UPDATE (not a read-then-write) so two concurrent
      // OUT movements on the same product can't both pass a stale stock check.
      if (type === 'OUT') {
        const updated = await tx.product.updateMany({
          where: { id: product.id, currentStock: { gte: quantity } },
          data: { currentStock: { decrement: quantity } },
        });
        if (updated.count === 0) {
          const fresh = await tx.product.findUnique({ where: { id: product.id } });
          throw new InsufficientStockError(
            `Insufficient stock: only ${fresh?.currentStock ?? 0} unit(s) of "${product.name}" available`,
          );
        }
      } else {
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: { increment: quantity } },
        });
      }

      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          quantity,
          type,
          reason,
          createdById: req.user!.userId,
        },
      });

      return movement;
    });

    res.status(201).json(result);
  } catch (err) {
    const status = statusForError(err);
    if (status) {
      res.status(status).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }
}
