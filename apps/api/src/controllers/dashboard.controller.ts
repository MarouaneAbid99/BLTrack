import { NextFunction, Request, Response } from 'express';
import * as dashboard from '../services/dashboard.service';

export const dailySummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => { try { res.json(await dashboard.dailySummary(req.query.date, req.auth!)); } catch (error) { next(error); } };
