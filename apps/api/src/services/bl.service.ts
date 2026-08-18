import { LegacyPaymentMethod, LegacyPaymentStatus, PaymentMethod, PaymentStatus, UserRole } from '@bltrack/shared';
import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../utils/prisma';

const safeUser = { id: true, username: true, fullName: true, role: true, isActive: true } as const;
export const includeBLRelations = {
  client: true,
  courier: { select: safeUser },
  createdBy: { select: safeUser },
  payment: { include: { createdBy: { select: safeUser } } },
  avoirs: { include: { createdBy: { select: safeUser } }, orderBy: { avoirDate: 'asc' as const } },
} as const;
type BLWithRelations = Prisma.BLGetPayload<{ include: typeof includeBLRelations }>;

export const serializeBL = (bl: BLWithRelations) => {
  const totalAvoir = bl.avoirs.reduce((total, avoir) => total.plus(avoir.amount), new Prisma.Decimal(0));
  const netAmount = bl.amount.minus(totalAvoir);
  const paidAmount = bl.payment?.status === PaymentStatus.PAID ? bl.payment.amount : null;
  return {
    ...bl,
    totalAvoirAmount: totalAvoir.toFixed(2),
    netAmount: netAmount.toFixed(2),
    paidAmount: paidAmount?.toFixed(2) ?? null,
    paymentDifferenceAmount: paidAmount?.minus(netAmount).toFixed(2) ?? null,
  };
};

export const objectInput = (input: unknown): Record<string, unknown> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError(400, 'VALIDATION_ERROR', 'Request body must be an object');
  return input as Record<string, unknown>;
};

export const rejectIdentityFields = (data: Record<string, unknown>, extra: string[] = []): void => {
  const protectedFields = ['createdBy', 'createdById', 'userId', 'courier', 'courierId', 'courierName', ...extra];
  const supplied = protectedFields.find((field) => Object.prototype.hasOwnProperty.call(data, field));
  if (supplied) throw new AppError(400, 'VALIDATION_ERROR', `${supplied} is server-owned and must not be supplied`);
};

export const amountValue = (value: unknown, field = 'amount'): Prisma.Decimal => {
  if (value instanceof Prisma.Decimal) {
    if (value.lte(0)) throw new AppError(400, 'VALIDATION_ERROR', `${field} must be positive`);
    return value;
  }
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^\d+(\.\d{1,2})?$/.test(String(value))) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} must be a positive value with at most two decimal places`);
  }
  const amount = new Prisma.Decimal(value);
  if (amount.lte(0)) throw new AppError(400, 'VALIDATION_ERROR', `${field} must be positive`);
  return amount;
};

export const dateValue = (value: unknown, field: string): Date => {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new AppError(400, 'VALIDATION_ERROR', `${field} must be a valid date`);
  return new Date(value);
};

const enumValue = <T extends Record<string, string>>(value: unknown, values: T, field: string): T[keyof T] => {
  if (typeof value !== 'string' || !Object.values(values).includes(value)) throw new AppError(400, 'VALIDATION_ERROR', `${field} is invalid`);
  return value as T[keyof T];
};

export const ownedBLWhere = (id: string, auth: { id: string; role: UserRole }): Prisma.BLWhereInput => ({
  id,
  ...(auth.role === UserRole.COURIER ? { createdById: auth.id } : {}),
});

export const getOwnedBL = async (id: string, auth: { id: string; role: UserRole }): Promise<BLWithRelations> => {
  const bl = await prisma.bL.findFirst({ where: ownedBLWhere(id, auth), include: includeBLRelations });
  if (!bl) throw new AppError(404, 'NOT_FOUND', 'BL not found');
  return bl;
};

type CanonicalPayment = {
  amount: Prisma.Decimal;
  status: PaymentStatus;
  method: PaymentMethod | null;
  paidAt: Date | null;
  legacyMethod: LegacyPaymentMethod | null;
  legacyStatus: LegacyPaymentStatus;
};

const paymentForCreate = (data: Record<string, unknown>, isAccountClient: boolean, blAmount: Prisma.Decimal): CanonicalPayment => {
  const payment = data.payment === undefined ? undefined : objectInput(data.payment);
  if (payment) rejectIdentityFields(payment, ['blId', 'paidAt']);
  const amount = amountValue(payment?.amount ?? blAmount, 'payment.amount');

  if (isAccountClient) {
    const legacyCompatible = data.paymentMethod === LegacyPaymentMethod.ACCOUNT && data.paymentStatus === LegacyPaymentStatus.PENDING;
    if (payment?.status !== undefined && payment.status !== PaymentStatus.EN_COMPTE) throw new AppError(400, 'VALIDATION_ERROR', 'Account clients must use EN_COMPTE');
    if (!payment && (data.paymentMethod !== undefined || data.paymentStatus !== undefined) && !legacyCompatible) throw new AppError(400, 'VALIDATION_ERROR', 'Account clients must use EN_COMPTE');
    if (payment?.method != null || payment?.paidAt != null) throw new AppError(400, 'VALIDATION_ERROR', 'EN_COMPTE cannot have a payment method or paidAt');
    return { amount, status: PaymentStatus.EN_COMPTE, method: null, paidAt: null, legacyMethod: LegacyPaymentMethod.ACCOUNT, legacyStatus: LegacyPaymentStatus.PENDING };
  }

  let status: PaymentStatus;
  let method: PaymentMethod | null = null;
  let paidAt: Date | null = null;
  if (payment) {
    status = enumValue(payment.status, PaymentStatus, 'payment.status') as PaymentStatus;
    if (status === PaymentStatus.EN_COMPTE) throw new AppError(400, 'VALIDATION_ERROR', 'Only account clients may use EN_COMPTE');
    if (status === PaymentStatus.PAID) {
      method = enumValue(payment.method, PaymentMethod, 'payment.method') as PaymentMethod;
      paidAt = new Date();
    } else if (payment.method != null || payment.paidAt != null) {
      throw new AppError(400, 'VALIDATION_ERROR', 'UNPAID cannot have a payment method or paidAt');
    }
  } else if (data.paymentStatus !== undefined || data.paymentMethod !== undefined) {
    const legacyStatus = enumValue(data.paymentStatus, LegacyPaymentStatus, 'paymentStatus') as LegacyPaymentStatus;
    const legacyMethod = data.paymentMethod === null ? null : enumValue(data.paymentMethod, LegacyPaymentMethod, 'paymentMethod') as LegacyPaymentMethod;
    if (legacyMethod === LegacyPaymentMethod.ACCOUNT) throw new AppError(400, 'VALIDATION_ERROR', 'Only account clients may use ACCOUNT/EN_COMPTE');
    status = legacyStatus === LegacyPaymentStatus.PAID ? PaymentStatus.PAID : PaymentStatus.UNPAID;
    if (status === PaymentStatus.PAID) {
      method = enumValue(legacyMethod, PaymentMethod, 'paymentMethod') as PaymentMethod;
      paidAt = new Date();
    } else if (data.paidAt != null) {
      throw new AppError(400, 'VALIDATION_ERROR', 'UNPAID cannot have paidAt');
    }
  } else {
    status = PaymentStatus.UNPAID;
  }
  return {
    amount,
    status,
    method,
    paidAt,
    legacyMethod: status === PaymentStatus.PAID
      ? method === PaymentMethod.CASH ? LegacyPaymentMethod.CASH : LegacyPaymentMethod.CHEQUE
      : null,
    legacyStatus: status === PaymentStatus.PAID ? LegacyPaymentStatus.PAID : LegacyPaymentStatus.PENDING,
  };
};

export const listBLs = async (query: Record<string, unknown>, auth: { id: string; role: UserRole }) => {
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(query.limit ?? '20'), 10) || 20));
  const where: Prisma.BLWhereInput = auth.role === UserRole.COURIER ? { createdById: auth.id } : {};
  if (typeof query.clientId === 'string') where.clientId = query.clientId;
  if (auth.role === UserRole.ADMIN && typeof query.courierId === 'string') where.createdById = query.courierId;
  if (typeof query.paymentMethod === 'string') where.paymentMethod = enumValue(query.paymentMethod, LegacyPaymentMethod, 'paymentMethod');
  if (typeof query.paymentStatus === 'string') where.paymentStatus = enumValue(query.paymentStatus, LegacyPaymentStatus, 'paymentStatus');
  if (typeof query.status === 'string') where.payment = { is: { status: enumValue(query.status, PaymentStatus, 'status') } };
  if (typeof query.search === 'string' && query.search.trim()) {
    const search = query.search.trim();
    where.OR = [{ blNumber: { contains: search } }, { client: { name: { contains: search } } }, { avoirs: { some: { brReference: { contains: search } } } }];
  }
  if (query.dateFrom !== undefined || query.dateTo !== undefined) {
    const dateTo = query.dateTo !== undefined ? dateValue(query.dateTo, 'dateTo') : undefined;
    const dateOnly = typeof query.dateTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.dateTo);
    if (dateTo && dateOnly) dateTo.setUTCDate(dateTo.getUTCDate() + 1);
    where.blDate = {
      ...(query.dateFrom !== undefined ? { gte: dateValue(query.dateFrom, 'dateFrom') } : {}),
      ...(dateTo ? (dateOnly ? { lt: dateTo } : { lte: dateTo }) : {}),
    };
  }
  const [rows, total] = await prisma.$transaction([
    prisma.bL.findMany({ where, include: includeBLRelations, orderBy: { blDate: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.bL.count({ where }),
  ]);
  return { data: rows.map(serializeBL), pagination: { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) } };
};

export const getBL = async (id: string, auth: { id: string; role: UserRole }) => serializeBL(await getOwnedBL(id, auth));

export const getBLSummary = async (auth: { id: string; role: UserRole }) => {
  const blWhere: Prisma.BLWhereInput = auth.role === UserRole.COURIER ? { createdById: auth.id } : {};
  const paymentWhere: Prisma.PaymentWhereInput = auth.role === UserRole.COURIER ? { bl: { createdById: auth.id } } : {};
  const [totalBLs, total, paid, unpaid, enCompte] = await prisma.$transaction([
    prisma.bL.count({ where: blWhere }),
    prisma.bL.aggregate({ where: blWhere, _sum: { amount: true } }),
    prisma.payment.count({ where: { ...paymentWhere, status: PaymentStatus.PAID } }),
    prisma.payment.count({ where: { ...paymentWhere, status: PaymentStatus.UNPAID } }),
    prisma.payment.count({ where: { ...paymentWhere, status: PaymentStatus.EN_COMPTE } }),
  ]);
  return {
    totalBLs,
    totalAmount: total._sum.amount?.toFixed(2) ?? '0.00',
    paid,
    unpaid,
    enCompte,
  };
};

export const createBL = async (input: unknown, auth: { id: string; role: UserRole }) => {
  const data = objectInput(input);
  rejectIdentityFields(data, ['paidAt']);
  const blNumber = typeof data.blNumber === 'string' ? data.blNumber.trim() : '';
  const clientId = typeof data.clientId === 'string' ? data.clientId.trim() : '';
  if (!blNumber || !clientId) throw new AppError(400, 'VALIDATION_ERROR', 'blNumber and clientId are required');
  const amount = amountValue(data.amount);
  const blDate = dateValue(data.blDate ?? data.deliveryDate, 'blDate');
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || !client.isActive) throw new AppError(400, 'VALIDATION_ERROR', 'clientId must reference an active client');
  const payment = paymentForCreate(data, client.isAccountClient, amount);
  const bl = await prisma.bL.create({
    data: {
      blNumber, clientId, amount, blDate, deliveryDate: blDate,
      createdById: auth.id, courierId: auth.id,
      paymentMethod: payment.legacyMethod, paymentStatus: payment.legacyStatus,
      comments: typeof data.comments === 'string' ? data.comments.trim() || null : null,
      payment: { create: { amount: payment.amount, status: payment.status, method: payment.method, paidAt: payment.paidAt, createdById: auth.id } },
    },
    include: includeBLRelations,
  });
  return serializeBL(bl);
};

export const updateBL = async (id: string, input: unknown, auth: { id: string; role: UserRole }) => {
  const data = objectInput(input);
  rejectIdentityFields(data);
  const existing = await getOwnedBL(id, auth);
  const supported = ['blNumber', 'clientId', 'amount', 'blDate', 'comments'];
  if (!Object.keys(data).length || Object.keys(data).some((key) => !supported.includes(key))) {
    throw new AppError(400, 'VALIDATION_ERROR', 'No supported BL fields were provided');
  }
  const nextClient = data.clientId === undefined
    ? existing.client
    : await prisma.client.findUnique({ where: { id: typeof data.clientId === 'string' ? data.clientId : '' } });
  if (!nextClient || !nextClient.isActive) throw new AppError(400, 'VALIDATION_ERROR', 'clientId must reference an active client');
  const nextAmount = data.amount === undefined ? existing.amount : amountValue(data.amount);
  const totalAvoir = existing.avoirs.reduce((total, avoir) => total.plus(avoir.amount), new Prisma.Decimal(0));
  const nextNet = nextAmount.minus(totalAvoir);
  if (nextNet.lt(0)) throw new AppError(400, 'VALIDATION_ERROR', 'BL amount cannot be lower than its total avoir amount');
  if (existing.payment?.status === PaymentStatus.PAID && existing.payment.amount.gt(nextNet)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'BL net amount cannot be lower than the registered payment amount');
  }
  if (existing.payment?.status === PaymentStatus.PAID && nextClient.isAccountClient) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A paid BL cannot be changed to an account client');
  }

  const paymentStatus = nextClient.isAccountClient
    ? PaymentStatus.EN_COMPTE
    : existing.payment?.status === PaymentStatus.EN_COMPTE ? PaymentStatus.UNPAID : existing.payment?.status;
  const legacyMethod = nextClient.isAccountClient
    ? LegacyPaymentMethod.ACCOUNT
    : paymentStatus === PaymentStatus.PAID
      ? existing.payment?.method === PaymentMethod.CASH ? LegacyPaymentMethod.CASH : LegacyPaymentMethod.CHEQUE
      : null;
  const legacyStatus = paymentStatus === PaymentStatus.PAID ? LegacyPaymentStatus.PAID : LegacyPaymentStatus.PENDING;
  const nextBLDate = data.blDate === undefined ? undefined : dateValue(data.blDate, 'blDate');
  const blNumber = data.blNumber === undefined ? undefined : typeof data.blNumber === 'string' ? data.blNumber.trim() : '';
  if (data.blNumber !== undefined && !blNumber) throw new AppError(400, 'VALIDATION_ERROR', 'blNumber is required');

  return prisma.$transaction(async (transaction) => {
    if (existing.payment && paymentStatus) {
      await transaction.payment.update({
        where: { id: existing.payment.id },
        data: {
          status: paymentStatus,
          method: paymentStatus === PaymentStatus.PAID ? existing.payment.method : null,
          paidAt: paymentStatus === PaymentStatus.PAID ? existing.payment.paidAt : null,
          ...(paymentStatus !== PaymentStatus.PAID ? { amount: nextNet } : {}),
        },
      });
    }
    const updated = await transaction.bL.update({
      where: { id: existing.id },
      data: {
        ...(blNumber !== undefined ? { blNumber } : {}),
        ...(data.clientId !== undefined ? { clientId: nextClient.id } : {}),
        ...(data.amount !== undefined ? { amount: nextAmount } : {}),
        ...(nextBLDate ? { blDate: nextBLDate, deliveryDate: nextBLDate } : {}),
        ...(data.comments !== undefined ? { comments: typeof data.comments === 'string' ? data.comments.trim() || null : null } : {}),
        paymentMethod: legacyMethod,
        paymentStatus: legacyStatus,
      },
      include: includeBLRelations,
    });
    return serializeBL(updated);
  });
};
