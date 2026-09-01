import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createFollowUpSchema } from '../schemas/followup.schema';
import { sendValidationError } from '../lib/httpError';

export async function listFollowUps(
  req: Request<{ customerId: string }>,
  res: Response,
): Promise<void> {
  const customer = await prisma.customer.findUnique({ where: { id: req.params.customerId } });
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const followUps = await prisma.followUp.findMany({
    where: { customerId: req.params.customerId },
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  res.json(followUps);
}

export async function createFollowUp(
  req: Request<{ customerId: string }>,
  res: Response,
): Promise<void> {
  const parsed = createFollowUpSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const customer = await prisma.customer.findUnique({ where: { id: req.params.customerId } });
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const followUp = await prisma.followUp.create({
    data: {
      ...parsed.data,
      customerId: req.params.customerId,
      createdById: req.user!.userId,
    },
  });
  res.status(201).json(followUp);
}
