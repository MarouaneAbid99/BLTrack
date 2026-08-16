import { UserRole } from '@bltrack/shared';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../utils/prisma';

const safeUser = { id: true, username: true, fullName: true, role: true, isActive: true, createdAt: true, updatedAt: true };

export const listCouriers = () => prisma.user.findMany({ where: { role: UserRole.COURIER, isActive: true }, select: safeUser, orderBy: { fullName: 'asc' } });

export const getCourier = async (id: string) => {
  const courier = await prisma.user.findFirst({ where: { id, role: UserRole.COURIER }, select: safeUser });
  if (!courier) throw new AppError(404, 'NOT_FOUND', 'Courier not found');
  return courier;
};
