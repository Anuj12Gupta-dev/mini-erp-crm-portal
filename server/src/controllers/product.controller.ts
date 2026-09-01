import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { createProductSchema, updateProductSchema, listProductsQuerySchema } from '../schemas/product.schema';

function withLowStockFlag<T extends { currentStock: number; minStockQty: number }>(product: T) {
  return { ...product, isLowStock: product.currentStock <= product.minStockQty };
}

export async function listProducts(req: Request, res: Response): Promise<void> {
  const parsed = listProductsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.issues });
    return;
  }
  const { page, pageSize, search, category, lowStock } = parsed.data;

  const where: Prisma.ProductWhereInput = {
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  if (lowStock) {
    // currentStock <= minStockQty is a cross-column comparison Prisma can't filter at the DB level.
    const all = await prisma.product.findMany({ where, orderBy: { createdAt: 'desc' } });
    const filtered = all.filter((p) => p.currentStock <= p.minStockQty);
    const total = filtered.length;
    const paged = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    res.json({
      data: paged.map(withLowStockFlag),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
    return;
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({
    data: products.map(withLowStockFlag),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function getProduct(req: Request<{ id: string }>, res: Response): Promise<void> {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json(withLowStockFlag(product));
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid product data', details: parsed.error.issues });
    return;
  }
  const { openingStock, ...data } = parsed.data;

  const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existingSku) {
    res.status(409).json({ error: 'A product with this SKU already exists' });
    return;
  }

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({ data: { ...data, currentStock: openingStock } });
    if (openingStock > 0) {
      await tx.stockMovement.create({
        data: {
          productId: created.id,
          quantity: openingStock,
          type: 'IN',
          reason: 'Opening stock',
          createdById: req.user!.userId,
        },
      });
    }
    return created;
  });

  res.status(201).json(withLowStockFlag(product));
}

export async function updateProduct(req: Request<{ id: string }>, res: Response): Promise<void> {
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid product data', details: parsed.error.issues });
    return;
  }

  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const { openingStock: _openingStock, ...data } = parsed.data;
  if (data.sku && data.sku !== existing.sku) {
    const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existingSku) {
      res.status(409).json({ error: 'A product with this SKU already exists' });
      return;
    }
  }

  const product = await prisma.product.update({ where: { id: req.params.id }, data });
  res.json(withLowStockFlag(product));
}

export async function deleteProduct(req: Request<{ id: string }>, res: Response): Promise<void> {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
