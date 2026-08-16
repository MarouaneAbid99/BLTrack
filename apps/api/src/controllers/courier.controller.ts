import { NextFunction, Request, Response } from 'express';
import * as couriers from '../services/courier.service';

export const listCouriers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => { try { res.json(await couriers.listCouriers()); } catch (error) { next(error); } };
export const getCourier = async (req: Request, res: Response, next: NextFunction): Promise<void> => { try { res.json(await couriers.getCourier(req.params.id)); } catch (error) { next(error); } };
