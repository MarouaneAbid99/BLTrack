import { AuthPayload, UserRole } from '@bltrack/shared';
import { NextFunction, Request, Response } from 'express';
import { AppError } from './error.middleware';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export const requireAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authorization = req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    next(new AppError(401, 'UNAUTHORIZED', 'Authentication is required'));
    return;
  }

  let payload: AuthPayload;
  try {
    payload = verifyToken(authorization.slice(7));
  } catch {
    next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, username: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      next(new AppError(401, 'UNAUTHORIZED', 'User is inactive or no longer exists'));
      return;
    }
    req.auth = { id: user.id, username: user.username, role: user.role as UserRole };
    next();
  } catch (error) {
    next(error);
  }
};
