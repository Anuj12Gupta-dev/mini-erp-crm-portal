import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller';
import { createStockMovement } from '../controllers/stockMovement.controller';

export const productRouter = Router();

const canManage = requireRole(Role.ADMIN, Role.WAREHOUSE);

productRouter.use(authenticate);

productRouter.get('/', listProducts);
productRouter.get('/:id', getProduct);
productRouter.post('/', canManage, createProduct);
productRouter.put('/:id', canManage, updateProduct);
productRouter.delete('/:id', canManage, deleteProduct);

productRouter.post('/:productId/stock-movements', canManage, createStockMovement);
