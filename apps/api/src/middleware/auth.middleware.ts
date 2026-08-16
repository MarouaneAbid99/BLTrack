import { AuthPayload } from '@bltrack/shared';
import { NextFunction, Request, Response } from 'express';
import { AppError } from './error.middleware';
import { verifyToken } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authorization = req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    next(new AppError(401, 'UNAUTHORIZED', 'Authentication is required'));
    return;
  }

  try {
    req.auth = verifyToken(authorization.slice(7));
    next();
  } catch {
    next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
};
