import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listStockMovements } from '../controllers/stockMovement.controller';

export const stockMovementRouter = Router();

stockMovementRouter.use(authenticate);
stockMovementRouter.get('/', listStockMovements);
