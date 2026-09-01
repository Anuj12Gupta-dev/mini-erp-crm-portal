import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller';
import { listFollowUps, createFollowUp } from '../controllers/followup.controller';

export const customerRouter = Router();

const canManage = requireRole(Role.ADMIN, Role.SALES);

customerRouter.use(authenticate);

customerRouter.get('/', listCustomers);
customerRouter.get('/:id', getCustomer);
customerRouter.post('/', canManage, createCustomer);
customerRouter.put('/:id', canManage, updateCustomer);
customerRouter.delete('/:id', canManage, deleteCustomer);

customerRouter.get('/:customerId/follow-ups', listFollowUps);
customerRouter.post('/:customerId/follow-ups', canManage, createFollowUp);
