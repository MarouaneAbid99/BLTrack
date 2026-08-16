import { Router } from 'express';
import * as controller from '../controllers/courier.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@bltrack/shared';
export const courierRouter = Router();
courierRouter.use(requireAuth, requireRole(UserRole.ADMIN));
courierRouter.get('/', controller.listCouriers);
courierRouter.get('/:id', controller.getCourier);
