import { Router } from 'express';
import * as controller from '../controllers/avoir.controller';
import { requireAuth } from '../middleware/auth.middleware';

export const avoirRouter = Router();
avoirRouter.use(requireAuth);
avoirRouter.patch('/:id', controller.update);
