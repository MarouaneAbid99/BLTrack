import { NextFunction, Request, Response } from 'express';
import * as bls from '../services/bl.service';

export const listBLs = async (req: Request, res: Response, next: NextFunction): Promise<void> => { try { res.json(await bls.listBLs(req.query, req.auth!)); } catch (error) { next(error); } };
export const summary = async (req: Request, res: Response, next: NextFunction): Promise<void> => { try { res.json(await bls.getBLSummary(req.auth!)); } catch (error) { next(error); } };
export const getBL = async (req: Request, res: Response, next: NextFunction): Promise<void> => { try { res.json(await bls.getBL(req.params.id, req.auth!)); } catch (error) { next(error); } };
export const createBL = async (req: Request, res: Response, next: NextFunction): Promise<void> => { try { res.status(201).json(await bls.createBL(req.body, req.auth!)); } catch (error) { next(error); } };
export const updateBL = async (req: Request, res: Response, next: NextFunction): Promise<void> => { try { res.json(await bls.updateBL(req.params.id, req.body, req.auth!)); } catch (error) { next(error); } };
