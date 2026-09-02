import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import {
  createChallanSchema,
  updateChallanSchema,
  listChallansQuerySchema,
} from '../schemas/challan.schema';
import { NotFoundError, ConflictError, InsufficientStockError, statusForError } from '../lib/errors';
import { sendValidationError } from '../lib/httpError';
import { streamChallanPdf } from '../lib/challanPdf';

type Tx = Prisma.TransactionClient;

const challanInclude = {
  customer: { select: { id: true, name: true, mobile: true, businessName: true, address: true } },
  createdBy: { select: { id: true, name: true } },
  items: true,
} satisfies Prisma.ChallanInclude;

function withTotalQuantity<T extends { items: { quantity: number }[] }>(challan: T) {
  return { ...challan, totalQuantity: challan.items.reduce((sum, item) => sum + item.quantity, 0) };
}

async function generateChallanNumber(tx: Tx): Promise<string> {
  const count = await tx.challan.count();
  return `CH-${String(count + 1).padStart(6, '0')}`;
}

async function buildItemsAndTotal(
  tx: Tx,
  items: { productId: string; quantity: number }[],
): Promise<{
  itemsData: {
    productId: string;
    productName: string;
    productSku: string;
    unitPrice: Prisma.Decimal;
    quantity: number;
    lineTotal: Prisma.Decimal;
  }[];
  totalAmount: Prisma.Decimal;
}> {
  const itemsData = [];
  let totalAmount = new Prisma.Decimal(0);

  for (const item of items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product) {
      throw new NotFoundError(`Product ${item.productId} not found`);
    }
    const lineTotal = product.unitPrice.mul(item.quantity);
    totalAmount = totalAmount.add(lineTotal);
    itemsData.push({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      unitPrice: product.unitPrice,
      quantity: item.quantity,
      lineTotal,
    });
  }

  return { itemsData, totalAmount };
}

export async function listChallans(req: Request, res: Response): Promise<void> {
  const parsed = listChallansQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }
  const { page, pageSize, search, status, customerId } = parsed.data;

  const where: Prisma.ChallanWhereInput = {
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
    ...(search
      ? {
          OR: [
            { challanNumber: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, challans] = await Promise.all([
    prisma.challan.count({ where }),
    prisma.challan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: challanInclude,
    }),
  ]);

  res.json({
    data: challans.map(withTotalQuantity),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function getChallan(req: Request<{ id: string }>, res: Response): Promise<void> {
  const challan = await prisma.challan.findUnique({
    where: { id: req.params.id },
    include: challanInclude,
  });
  if (!challan) {
    res.status(404).json({ error: 'Challan not found' });
    return;
  }
  res.json(withTotalQuantity(challan));
}

export async function downloadChallanPdf(req: Request<{ id: string }>, res: Response): Promise<void> {
  const challan = await prisma.challan.findUnique({
    where: { id: req.params.id },
    include: challanInclude,
  });
  if (!challan) {
    res.status(404).json({ error: 'Challan not found' });
    return;
  }
  streamChallanPdf(res, challan);
}

export async function createChallan(req: Request, res: Response): Promise<void> {
  const parsed = createChallanSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }
  const { customerId, items } = parsed.data;

  try {
    const challan = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        throw new NotFoundError('Customer not found');
      }

      const { itemsData, totalAmount } = await buildItemsAndTotal(tx, items);
      const challanNumber = await generateChallanNumber(tx);

      return tx.challan.create({
        data: {
          challanNumber,
          customerId,
          totalAmount,
          createdById: req.user!.userId,
          items: { create: itemsData },
        },
        include: challanInclude,
      });
    });

    res.status(201).json(withTotalQuantity(challan));
  } catch (err) {
    const status = statusForError(err);
    if (status) {
      res.status(status).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }
}

export async function updateChallan(req: Request<{ id: string }>, res: Response): Promise<void> {
  const parsed = updateChallanSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  try {
    const challan = await prisma.$transaction(async (tx) => {
      const existing = await tx.challan.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        throw new NotFoundError('Challan not found');
      }
      if (existing.status !== 'DRAFT') {
        throw new ConflictError('Only draft challans can be edited');
      }

      const customerId = parsed.data.customerId ?? existing.customerId;
      if (parsed.data.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
          throw new NotFoundError('Customer not found');
        }
      }

      const updateData: Prisma.ChallanUpdateInput = { customer: { connect: { id: customerId } } };

      if (parsed.data.items) {
        const { itemsData, totalAmount } = await buildItemsAndTotal(tx, parsed.data.items);
        await tx.challanItem.deleteMany({ where: { challanId: existing.id } });
        updateData.items = { create: itemsData };
        updateData.totalAmount = totalAmount;
      }

      return tx.challan.update({
        where: { id: existing.id },
        data: updateData,
        include: challanInclude,
      });
    });

    res.json(withTotalQuantity(challan));
  } catch (err) {
    const status = statusForError(err);
    if (status) {
      res.status(status).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }
}

export async function deleteChallan(req: Request<{ id: string }>, res: Response): Promise<void> {
  const existing = await prisma.challan.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Challan not found' });
    return;
  }
  if (existing.status !== 'DRAFT') {
    res.status(409).json({ error: 'Only draft challans can be deleted' });
    return;
  }
  await prisma.challan.delete({ where: { id: existing.id } });
  res.status(204).send();
}

export async function confirmChallan(req: Request<{ id: string }>, res: Response): Promise<void> {
  try {
    const challan = await prisma.$transaction(async (tx) => {
      const existing = await tx.challan.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });
      if (!existing) {
        throw new NotFoundError('Challan not found');
      }
      if (existing.status !== 'DRAFT') {
        throw new ConflictError(`Cannot confirm a challan with status ${existing.status}`);
      }

      // Decrement is a single conditional UPDATE (not a read-then-write) so two challans
      // confirming the same product concurrently can't both pass a stale stock check.
      for (const item of existing.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new NotFoundError(`Product "${item.productName}" no longer exists`);
        }

        const result = await tx.product.updateMany({
          where: { id: item.productId, currentStock: { gte: item.quantity } },
          data: { currentStock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          const fresh = await tx.product.findUnique({ where: { id: item.productId } });
          throw new InsufficientStockError(
            `Insufficient stock for "${item.productName}": only ${fresh?.currentStock ?? 0} unit(s) available, ${item.quantity} required`,
          );
        }

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            type: 'OUT',
            reason: `Challan ${existing.challanNumber} confirmed`,
            createdById: req.user!.userId,
          },
        });
      }

      return tx.challan.update({
        where: { id: existing.id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
        include: challanInclude,
      });
    });

    res.json(withTotalQuantity(challan));
  } catch (err) {
    const status = statusForError(err);
    if (status) {
      res.status(status).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }
}

export async function cancelChallan(req: Request<{ id: string }>, res: Response): Promise<void> {
  try {
    const challan = await prisma.$transaction(async (tx) => {
      const existing = await tx.challan.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });
      if (!existing) {
        throw new NotFoundError('Challan not found');
      }
      if (existing.status === 'CANCELLED') {
        throw new ConflictError('Challan is already cancelled');
      }

      if (existing.status === 'CONFIRMED') {
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              type: 'IN',
              reason: `Challan ${existing.challanNumber} cancelled - stock returned`,
              createdById: req.user!.userId,
            },
          });
        }
      }

      return tx.challan.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
        include: challanInclude,
      });
    });

    res.json(withTotalQuantity(challan));
  } catch (err) {
    const status = statusForError(err);
    if (status) {
      res.status(status).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }
}
