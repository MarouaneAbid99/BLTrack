import { Router } from 'express';
import { UserRole } from '@bltrack/shared';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import * as controller from '../controllers/report.controller';

export const reportRouter = Router();
reportRouter.use(requireAuth, requireRole(UserRole.ADMIN));
reportRouter.get('/collections', controller.collections);
reportRouter.get('/client-financials', controller.clientFinancials);
reportRouter.get('/courier-performance', controller.courierPerformance);
