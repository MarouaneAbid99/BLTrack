import { Router } from 'express';
import * as controller from '../controllers/bl.controller';
import { requireAuth } from '../middleware/auth.middleware';
export const blRouter = Router();
blRouter.use(requireAuth);
blRouter.get('/', controller.listBLs);
blRouter.get('/:id', controller.getBL);
blRouter.post('/', controller.createBL);
blRouter.patch('/:id', controller.updateBL);
