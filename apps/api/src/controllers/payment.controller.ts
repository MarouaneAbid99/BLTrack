import { NextFunction, Request, Response } from 'express';
import * as payments from '../services/payment.service';

export const putForBL = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await payments.putPayment(req.params.id, req.body, req.auth!)); } catch (error) { next(error); }
};
