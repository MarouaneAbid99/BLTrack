import { Router } from 'express';
import { dailySummary } from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';
export const dashboardRouter = Router();
dashboardRouter.get('/daily-summary', requireAuth, dailySummary);
