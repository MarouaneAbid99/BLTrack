import {
  LegacyPaymentMethod,
  LegacyPaymentStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from '@bltrack/shared';
import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../utils/prisma';
import {
  amountValue,
  getOwnedBL,
  objectInput,
  rejectIdentityFields,
} from './bl.service';

const statusValue = (value: unknown): PaymentStatus => {
  if (typeof value !== 'string' || !Object.values(PaymentStatus).includes(value as PaymentStatus)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'payment.status is invalid');
  }
  return value as PaymentStatus;
};

const methodValue = (value: unknown): PaymentMethod => {
  if (typeof value !== 'string' || !Object.values(PaymentMethod).includes(value as PaymentMethod)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'PAID requires CASH or CHEQUE');
  }
  return value as PaymentMethod;
};

export const putPayment = async (blId: string, input: unknown, auth: { id: string; role: UserRole }) => {
  const data = objectInput(input);
  rejectIdentityFields(data, ['blId', 'isLegacyMigrated', 'paidAt']);
  const bl = await getOwnedBL(blId, auth);
  const amount = amountValue(data.amount, 'payment.amount');
  const totalAvoir = bl.avoirs.reduce((sum, avoir) => sum.plus(avoir.amount), new Prisma.Decimal(0));
  const netAmount = bl.amount.minus(totalAvoir);
  if (amount.gt(netAmount)) throw new AppError(400, 'VALIDATION_ERROR', 'Payment amount cannot exceed the BL net amount');

  const status = statusValue(data.status);
  if (bl.client.isAccountClient && status !== PaymentStatus.EN_COMPTE) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Account clients must use EN_COMPTE');
  }
  if (!bl.client.isAccountClient && status === PaymentStatus.EN_COMPTE) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Only account clients may use EN_COMPTE');
  }

  let method: PaymentMethod | null = null;
  let paidAt: Date | null = null;
  if (status === PaymentStatus.PAID) {
    method = methodValue(data.method);
    paidAt = new Date();
  } else if (data.method != null) {
    throw new AppError(400, 'VALIDATION_ERROR', `${status} cannot have a payment method`);
  }

  const legacyMethod = status === PaymentStatus.EN_COMPTE
    ? LegacyPaymentMethod.ACCOUNT
    : status === PaymentStatus.PAID
      ? method === PaymentMethod.CASH ? LegacyPaymentMethod.CASH : LegacyPaymentMethod.CHEQUE
      : null;
  const legacyStatus = status === PaymentStatus.PAID ? LegacyPaymentStatus.PAID : LegacyPaymentStatus.PENDING;

  return prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.upsert({
      where: { blId: bl.id },
      create: {
        blId: bl.id,
        amount,
        status,
        method,
        paidAt,
        createdById: auth.id,
      },
      update: {
        amount,
        status,
        method,
        paidAt,
        isLegacyMigrated: false,
      },
      include: { createdBy: { select: { id: true, username: true, fullName: true } } },
    });
    await transaction.bL.update({
      where: { id: bl.id },
      data: { paymentMethod: legacyMethod, paymentStatus: legacyStatus },
    });
    return payment;
  });
};
