import { UserRole } from '@bltrack/shared';
import { NextFunction, Request, Response } from 'express';
import { AppError } from './error.middleware';

export const requireRole = (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action'));
      return;
    }
    next();
  };
