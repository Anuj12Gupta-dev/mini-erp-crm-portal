import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
} from '../schemas/customer.schema';

export async function listCustomers(req: Request, res: Response): Promise<void> {
  const parsed = listCustomersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.issues });
    return;
  }
  const { page, pageSize, search, status, type } = parsed.data;

  const where: Prisma.CustomerWhereInput = {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { mobile: { contains: search, mode: 'insensitive' } },
            { businessName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({ data: customers, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
}

export async function getCustomer(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  res.json(customer);
}

export async function createCustomer(req: Request, res: Response): Promise<void> {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid customer data', details: parsed.error.issues });
    return;
  }
  const customer = await prisma.customer.create({ data: parsed.data });
  res.status(201).json(customer);
}

export async function updateCustomer(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid customer data', details: parsed.error.issues });
    return;
  }

  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(customer);
}

export async function deleteCustomer(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  await prisma.customer.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
