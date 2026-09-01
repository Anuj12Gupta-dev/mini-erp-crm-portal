import { Request, Response } from 'express';
import { prisma } from '../prisma';
import {
  createStockMovementSchema,
  listStockMovementsQuerySchema,
} from '../schemas/stockMovement.schema';

export async function listStockMovements(req: Request, res: Response): Promise<void> {
  const parsed = listStockMovementsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.issues });
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
    res.status(400).json({ error: 'Invalid stock movement data', details: parsed.error.issues });
    return;
  }
  const { quantity, type, reason } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: req.params.productId } });
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      if (type === 'OUT' && product.currentStock < quantity) {
        throw new InsufficientStockError(
          `Insufficient stock: only ${product.currentStock} unit(s) of "${product.name}" available`,
        );
      }

      const newStock = type === 'IN' ? product.currentStock + quantity : product.currentStock - quantity;

      const [movement] = await Promise.all([
        tx.stockMovement.create({
          data: {
            productId: product.id,
            quantity,
            type,
            reason,
            createdById: req.user!.userId,
          },
        }),
        tx.product.update({ where: { id: product.id }, data: { currentStock: newStock } }),
      ]);

      return movement;
    });

    res.status(201).json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof InsufficientStockError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
}

class NotFoundError extends Error {}
class InsufficientStockError extends Error {}
