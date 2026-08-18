import cors, { CorsOptions } from 'cors';
import express from 'express';
import { env } from './config/env';
import { AppError, errorMiddleware } from './middleware/error.middleware';
import { authRouter } from './routes/auth.routes';
import { blRouter } from './routes/bl.routes';
import { clientRouter } from './routes/client.routes';
import { courierRouter } from './routes/courier.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { reportRouter } from './routes/report.routes';
import { avoirRouter } from './routes/avoir.routes';

export const app = express();
const corsOrigin: CorsOptions['origin'] = (origin, callback) => {
  if (!origin || env.nodeEnv !== 'production') return callback(null, true);
  return callback(null, env.corsOrigins.includes(origin));
};
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '100kb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'BLTrack API' }));
app.use('/api/auth', authRouter);
app.use('/api/clients', clientRouter);
app.use('/api/bls', blRouter);
app.use('/api/avoirs', avoirRouter);
app.use('/api/couriers', courierRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportRouter);
app.use((_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Route not found')));
app.use(errorMiddleware);
