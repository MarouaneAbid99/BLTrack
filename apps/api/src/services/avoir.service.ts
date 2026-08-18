import { Prisma } from '@prisma/client';
import { PaymentStatus, UserRole } from '@bltrack/shared';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../utils/prisma';
import {
  amountValue,
  dateValue,
  getOwnedBL,
  objectInput,
  rejectIdentityFields,
} from './bl.service';

const requireReference = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'brReference is required');
  }
  return value.trim();
};

const ensureTotalWithinBL = (
  blAmount: Prisma.Decimal,
  existingAmounts: Prisma.Decimal[],
  nextAmount: Prisma.Decimal,
): void => {
  const total = existingAmounts.reduce((sum, amount) => sum.plus(amount), nextAmount);
  if (total.gt(blAmount)) throw new AppError(400, 'VALIDATION_ERROR', 'Total avoir amount cannot exceed the BL amount');
};

export const listAvoirsForBL = async (blId: string, auth: { id: string; role: UserRole }) => {
  await getOwnedBL(blId, auth);
  return prisma.avoir.findMany({
    where: { blId },
    include: { client: true, createdBy: { select: { id: true, username: true, fullName: true } } },
    orderBy: { avoirDate: 'asc' },
  });
};

export const createAvoir = async (blId: string, input: unknown, auth: { id: string; role: UserRole }) => {
  const data = objectInput(input);
  rejectIdentityFields(data, ['blId', 'clientId']);
  const bl = await getOwnedBL(blId, auth);
  const amount = amountValue(data.amount, 'avoir.amount');
  ensureTotalWithinBL(bl.amount, bl.avoirs.map((avoir) => avoir.amount), amount);
  const nextNet = bl.amount.minus(bl.avoirs.reduce((sum, avoir) => sum.plus(avoir.amount), amount));
  if (bl.payment && bl.payment.status !== PaymentStatus.PAID && nextNet.eq(0)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A full-value avoir is not supported while an unpaid balance must remain positive');
  }
  return prisma.$transaction(async (transaction) => {
    const avoir = await transaction.avoir.create({
      data: {
        brReference: requireReference(data.brReference),
        avoirDate: dateValue(data.avoirDate, 'avoirDate'),
        amount,
        blId: bl.id,
        clientId: bl.clientId,
        createdById: auth.id,
      },
      include: { client: true, createdBy: { select: { id: true, username: true, fullName: true } } },
    });
    if (bl.payment && bl.payment.status !== PaymentStatus.PAID) {
      await transaction.payment.update({ where: { id: bl.payment.id }, data: { amount: nextNet } });
    }
    return avoir;
  });
};

export const updateAvoir = async (id: string, input: unknown, auth: { id: string; role: UserRole }) => {
  const data = objectInput(input);
  rejectIdentityFields(data, ['blId', 'clientId']);
  const existing = await prisma.avoir.findFirst({
    where: { id, ...(auth.role === UserRole.COURIER ? { bl: { createdById: auth.id } } : {}) },
    include: { bl: { include: { avoirs: true } } },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Avoir not found');
  if (data.brReference === undefined && data.avoirDate === undefined && data.amount === undefined) {
    throw new AppError(400, 'VALIDATION_ERROR', 'No supported fields were provided');
  }
  const amount = data.amount === undefined ? existing.amount : amountValue(data.amount, 'avoir.amount');
  ensureTotalWithinBL(
    existing.bl.amount,
    existing.bl.avoirs.filter((avoir) => avoir.id !== id).map((avoir) => avoir.amount),
    amount,
  );
  const nextTotal = existing.bl.avoirs.filter((avoir) => avoir.id !== id).reduce((sum, avoir) => sum.plus(avoir.amount), amount);
  const nextNet = existing.bl.amount.minus(nextTotal);
  const payment = await prisma.payment.findUnique({ where: { blId: existing.bl.id } });
  if (payment && payment.status !== PaymentStatus.PAID && nextNet.eq(0)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A full-value avoir is not supported while an unpaid balance must remain positive');
  }
  return prisma.$transaction(async (transaction) => {
    const avoir = await transaction.avoir.update({
      where: { id },
      data: {
        ...(data.brReference !== undefined ? { brReference: requireReference(data.brReference) } : {}),
        ...(data.avoirDate !== undefined ? { avoirDate: dateValue(data.avoirDate, 'avoirDate') } : {}),
        ...(data.amount !== undefined ? { amount } : {}),
      },
      include: { client: true, createdBy: { select: { id: true, username: true, fullName: true } } },
    });
    if (payment && payment.status !== PaymentStatus.PAID) {
      await transaction.payment.update({ where: { id: payment.id }, data: { amount: nextNet } });
    }
    return avoir;
  });
};
