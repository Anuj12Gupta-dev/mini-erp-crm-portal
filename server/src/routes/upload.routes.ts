import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import { presignUpload } from '../controllers/upload.controller';

export const uploadRouter = Router();

uploadRouter.use(authenticate);
uploadRouter.post('/presign', requireRole(Role.ADMIN, Role.WAREHOUSE), presignUpload);
