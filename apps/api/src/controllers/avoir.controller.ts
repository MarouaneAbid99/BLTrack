import { NextFunction, Request, Response } from 'express';
import * as avoirs from '../services/avoir.service';

export const listForBL = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await avoirs.listAvoirsForBL(req.params.id, req.auth!)); } catch (error) { next(error); }
};

export const createForBL = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.status(201).json(await avoirs.createAvoir(req.params.id, req.body, req.auth!)); } catch (error) { next(error); }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await avoirs.updateAvoir(req.params.id, req.body, req.auth!)); } catch (error) { next(error); }
};
