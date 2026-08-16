import { PaymentMethod, PaymentStatus, UserRole } from '@bltrack/shared';
import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../utils/prisma';

const formatAmount = (amount: Prisma.Decimal | null | undefined): string => amount ? amount.toFixed(2) : '0.00';

export const dailySummary = async (date: unknown, auth: { id: string; role: UserRole }) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00.000Z`))) {
    throw new AppError(400, 'VALIDATION_ERROR', 'date must use YYYY-MM-DD');
  }
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
  const where: Prisma.BLWhereInput = { deliveryDate: { gte: start, lt: end }, ...(auth.role === UserRole.COURIER ? { courierId: auth.id } : {}) };
  const [totalBLs, totals, byStatus, byMethod] = await prisma.$transaction([
    prisma.bL.count({ where }),
    prisma.bL.aggregate({ where, _sum: { amount: true } }),
    prisma.bL.groupBy({ by: ['paymentStatus'], where, orderBy: { paymentStatus: 'asc' }, _sum: { amount: true } }),
    prisma.bL.groupBy({ by: ['paymentMethod'], where, orderBy: { paymentMethod: 'asc' }, _sum: { amount: true } }),
  ]);
  const statusAmount = (status: PaymentStatus) => formatAmount(byStatus.find((entry) => entry.paymentStatus === status)?._sum?.amount);
  const methodAmount = (method: PaymentMethod) => formatAmount(byMethod.find((entry) => entry.paymentMethod === method)?._sum?.amount);
  return { date, totalBLs, totalAmount: formatAmount(totals._sum.amount), paidAmount: statusAmount(PaymentStatus.PAID), pendingAmount: statusAmount(PaymentStatus.PENDING), cashAmount: methodAmount(PaymentMethod.CASH), chequeAmount: methodAmount(PaymentMethod.CHEQUE), accountAmount: methodAmount(PaymentMethod.ACCOUNT) };
};
