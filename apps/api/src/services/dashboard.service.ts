import { LegacyPaymentMethod, LegacyPaymentStatus, UserRole } from '@bltrack/shared';
import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../utils/prisma';
import { casablancaDayRange } from '../utils/casablanca-time';

const formatAmount = (amount: Prisma.Decimal | null | undefined): string => amount ? amount.toFixed(2) : '0.00';

export const dailySummary = async (date: unknown, auth: { id: string; role: UserRole }) => {
  let range;
  try { range = casablancaDayRange(date); }
  catch (error) { throw new AppError(400, 'VALIDATION_ERROR', error instanceof Error ? error.message : 'Invalid date'); }
  const { start, end } = range;
  const where: Prisma.BLWhereInput = { deliveryDate: { gte: start, lt: end }, ...(auth.role === UserRole.COURIER ? { courierId: auth.id } : {}) };
  const [totalBLs, totals, byStatus, byMethod] = await prisma.$transaction([
    prisma.bL.count({ where }),
    prisma.bL.aggregate({ where, _sum: { amount: true } }),
    prisma.bL.groupBy({ by: ['paymentStatus'], where, orderBy: { paymentStatus: 'asc' }, _sum: { amount: true } }),
    prisma.bL.groupBy({ by: ['paymentMethod'], where, orderBy: { paymentMethod: 'asc' }, _sum: { amount: true } }),
  ]);
  const statusAmount = (status: LegacyPaymentStatus) => formatAmount(byStatus.find((entry) => entry.paymentStatus === status)?._sum?.amount);
  const methodAmount = (method: LegacyPaymentMethod) => formatAmount(byMethod.find((entry) => entry.paymentMethod === method)?._sum?.amount);
  return { date, totalBLs, totalAmount: formatAmount(totals._sum.amount), paidAmount: statusAmount(LegacyPaymentStatus.PAID), pendingAmount: statusAmount(LegacyPaymentStatus.PENDING), cashAmount: methodAmount(LegacyPaymentMethod.CASH), chequeAmount: methodAmount(LegacyPaymentMethod.CHEQUE), accountAmount: methodAmount(LegacyPaymentMethod.ACCOUNT) };
};
