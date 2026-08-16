import { NextFunction, Request, Response } from 'express';
import * as authService from '../services/auth.service';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await authService.login(req.body)); } catch (error) { next(error); }
};
