import { NextFunction, Request, Response } from 'express';
import * as clients from '../services/client.service';

export const listClients = async (req: Request, res: Response, next: NextFunction): Promise<void> => { try { res.json(await clients.listClients(req.auth!.role)); } catch (error) { next(error); } };
export const getClient = async (req: Request, res: Response, next: NextFunction): Promise<void> => { try { res.json(await clients.getClient(req.params.id, req.auth!.role)); } catch (error) { next(error); } };
export const createClient = async (req: Request, res: Response, next: NextFunction): Promise<void> => { try { res.status(201).json(await clients.createClient(req.body)); } catch (error) { next(error); } };
export const updateClient = async (req: Request, res: Response, next: NextFunction): Promise<void> => { try { res.json(await clients.updateClient(req.params.id, req.body)); } catch (error) { next(error); } };
