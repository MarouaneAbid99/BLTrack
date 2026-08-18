import { NextFunction, Request, Response } from 'express';
import * as reports from '../services/report.service';

export const blReport = async (req: Request, res: Response, next: NextFunction) => { try { res.json(await reports.blReport(req.query, req.auth!)); } catch (error) { next(error); } };
export const avoirReport = async (req: Request, res: Response, next: NextFunction) => { try { res.json(await reports.avoirReport(req.query, req.auth!)); } catch (error) { next(error); } };
export const collections = async (req: Request, res: Response, next: NextFunction) => { try { res.json(await reports.collections(req.query)); } catch (error) { next(error); } };
export const clientFinancials = async (req: Request, res: Response, next: NextFunction) => { try { res.json(await reports.clientFinancials(req.query)); } catch (error) { next(error); } };
export const courierPerformance = async (req: Request, res: Response, next: NextFunction) => { try { res.json(await reports.courierPerformance(req.query)); } catch (error) { next(error); } };
