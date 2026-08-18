import { Router } from 'express';
import { UserRole } from '@bltrack/shared';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import * as controller from '../controllers/report.controller';

export const reportRouter = Router();
reportRouter.use(requireAuth);
reportRouter.get('/bl', controller.blReport);
reportRouter.get('/avoirs', controller.avoirReport);
reportRouter.get('/collections', requireRole(UserRole.ADMIN), controller.collections);
reportRouter.get('/client-financials', requireRole(UserRole.ADMIN), controller.clientFinancials);
reportRouter.get('/courier-performance', requireRole(UserRole.ADMIN), controller.courierPerformance);
