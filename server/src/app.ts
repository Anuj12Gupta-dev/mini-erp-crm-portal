import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes';
import { customerRouter } from './routes/customer.routes';
import { productRouter } from './routes/product.routes';
import { stockMovementRouter } from './routes/stockMovement.routes';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/customers', customerRouter);
app.use('/products', productRouter);
app.use('/stock-movements', stockMovementRouter);

export default app;
