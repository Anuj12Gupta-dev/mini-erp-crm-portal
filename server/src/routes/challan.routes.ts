import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import {
  listChallans,
  getChallan,
  downloadChallanPdf,
  createChallan,
  updateChallan,
  deleteChallan,
  confirmChallan,
  cancelChallan,
} from '../controllers/challan.controller';

export const challanRouter = Router();

const canEditDraft = requireRole(Role.ADMIN, Role.SALES);
const canConfirmOrCancel = requireRole(Role.ADMIN, Role.WAREHOUSE);

challanRouter.use(authenticate);

challanRouter.get('/', listChallans);
challanRouter.get('/:id', getChallan);
challanRouter.get('/:id/pdf', downloadChallanPdf);
challanRouter.post('/', canEditDraft, createChallan);
challanRouter.put('/:id', canEditDraft, updateChallan);
challanRouter.delete('/:id', canEditDraft, deleteChallan);
challanRouter.post('/:id/confirm', canConfirmOrCancel, confirmChallan);
challanRouter.post('/:id/cancel', canConfirmOrCancel, cancelChallan);
