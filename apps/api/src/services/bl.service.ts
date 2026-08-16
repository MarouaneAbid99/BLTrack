import { PaymentMethod, PaymentStatus, UserRole } from '@bltrack/shared';
import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../utils/prisma';

const includeRelations = { client: true, courier: { select: { id: true, username: true, fullName: true, role: true, isActive: true } } };

const enumValue = <T extends Record<string, string>>(value: unknown, values: T, field: string): T[keyof T] => {
  if (typeof value !== 'string' || !Object.values(values).includes(value)) throw new AppError(400, 'VALIDATION_ERROR', `${field} is invalid`);
  return value as T[keyof T];
};

const amountValue = (value: unknown): Prisma.Decimal => {
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^\d+(\.\d{1,2})?$/.test(String(value)) || new Prisma.Decimal(value).lte(0)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'amount must be a positive value with at most two decimal places');
  }
  return new Prisma.Decimal(value);
};

const dateValue = (value: unknown, field = 'deliveryDate'): Date => {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new AppError(400, 'VALIDATION_ERROR', `${field} must be a valid date`);
  return new Date(value);
};

const objectInput = (input: unknown): Record<string, unknown> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request body must be an object');
  }
  return input as Record<string, unknown>;
};

const validatePayment = (method: PaymentMethod, status: PaymentStatus): void => {
  const valid = (method === PaymentMethod.ACCOUNT && status === PaymentStatus.PENDING)
    || (method !== PaymentMethod.ACCOUNT && status === PaymentStatus.PAID);
  if (!valid) throw new AppError(400, 'VALIDATION_ERROR', 'CASH and CHEQUE must be PAID; ACCOUNT must be PENDING');
};

export const listBLs = async (query: Record<string, unknown>, auth: { id: string; role: UserRole }) => {
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(query.limit ?? '20'), 10) || 20));
  const where: Prisma.BLWhereInput = auth.role === UserRole.COURIER ? { courierId: auth.id } : {};
  if (typeof query.clientId === 'string') where.clientId = query.clientId;
  if (auth.role === UserRole.ADMIN && typeof query.courierId === 'string') where.courierId = query.courierId;
  if (typeof query.paymentMethod === 'string') where.paymentMethod = enumValue(query.paymentMethod, PaymentMethod, 'paymentMethod');
  if (typeof query.paymentStatus === 'string') where.paymentStatus = enumValue(query.paymentStatus, PaymentStatus, 'paymentStatus');
  if (typeof query.search === 'string' && query.search.trim()) where.OR = [{ blNumber: { contains: query.search.trim() } }, { client: { name: { contains: query.search.trim() } } }];
  if (query.dateFrom !== undefined || query.dateTo !== undefined) {
    const dateTo = query.dateTo !== undefined ? dateValue(query.dateTo, 'dateTo') : undefined;
    const dateToIsDateOnly = typeof query.dateTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.dateTo);
    if (dateTo && dateToIsDateOnly) dateTo.setUTCDate(dateTo.getUTCDate() + 1);
    where.deliveryDate = {
      ...(query.dateFrom !== undefined ? { gte: dateValue(query.dateFrom, 'dateFrom') } : {}),
      ...(dateTo ? (dateToIsDateOnly ? { lt: dateTo } : { lte: dateTo }) : {}),
    };
  }
  const [data, total] = await prisma.$transaction([
    prisma.bL.findMany({ where, include: includeRelations, orderBy: { deliveryDate: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.bL.count({ where }),
  ]);
  return { data, pagination: { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) } };
};

export const getBL = async (id: string, auth: { id: string; role: UserRole }) => {
  const bl = await prisma.bL.findFirst({ where: { id, ...(auth.role === UserRole.COURIER ? { courierId: auth.id } : {}) }, include: includeRelations });
  if (!bl) throw new AppError(404, 'NOT_FOUND', 'BL not found');
  return bl;
};

export const createBL = async (input: unknown, auth: { id: string; role: UserRole }) => {
  const data = objectInput(input);
  const blNumber = typeof data.blNumber === 'string' ? data.blNumber.trim() : '';
  const clientId = typeof data.clientId === 'string' ? data.clientId : '';
  if (!blNumber || !clientId) throw new AppError(400, 'VALIDATION_ERROR', 'blNumber and clientId are required');
  const paymentMethod = enumValue(data.paymentMethod, PaymentMethod, 'paymentMethod') as PaymentMethod;
  const paymentStatus = enumValue(data.paymentStatus, PaymentStatus, 'paymentStatus') as PaymentStatus;
  validatePayment(paymentMethod, paymentStatus);
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || !client.isActive) throw new AppError(400, 'VALIDATION_ERROR', 'clientId must reference an active client');
  let courierId = auth.id;
  if (auth.role === UserRole.ADMIN) {
    if (typeof data.courierId !== 'string' || !data.courierId) throw new AppError(400, 'VALIDATION_ERROR', 'courierId is required when an admin creates a BL');
    const courier = await prisma.user.findUnique({ where: { id: data.courierId } });
    if (!courier || !courier.isActive || courier.role !== UserRole.COURIER) throw new AppError(400, 'VALIDATION_ERROR', 'courierId must reference an active courier');
    courierId = courier.id;
  }
  return prisma.bL.create({ data: {
    blNumber, clientId, courierId, amount: amountValue(data.amount), paymentMethod, paymentStatus,
    deliveryDate: dateValue(data.deliveryDate), comments: typeof data.comments === 'string' ? data.comments.trim() || null : null,
  }, include: includeRelations });
};

export const updateBL = async (id: string, input: unknown, auth: { id: string; role: UserRole }) => {
  const data = objectInput(input);
  const existing = await getBL(id, auth);
  if (auth.role === UserRole.COURIER) {
    if (data.comments === undefined || Object.keys(data).some((key) => key !== 'comments')) throw new AppError(403, 'FORBIDDEN', 'Couriers may update only comments on their own BLs');
    return prisma.bL.update({ where: { id: existing.id }, data: { comments: typeof data.comments === 'string' ? data.comments.trim() || null : null }, include: includeRelations });
  }
  if (data.paymentMethod === undefined && data.paymentStatus === undefined && data.comments === undefined) throw new AppError(400, 'VALIDATION_ERROR', 'No supported fields were provided');
  const paymentMethod = data.paymentMethod === undefined ? existing.paymentMethod : enumValue(data.paymentMethod, PaymentMethod, 'paymentMethod') as PaymentMethod;
  const paymentStatus = data.paymentStatus === undefined ? existing.paymentStatus : enumValue(data.paymentStatus, PaymentStatus, 'paymentStatus') as PaymentStatus;
  validatePayment(paymentMethod as PaymentMethod, paymentStatus as PaymentStatus);
  return prisma.bL.update({ where: { id: existing.id }, data: {
    paymentMethod, paymentStatus,
    ...(data.comments !== undefined ? { comments: typeof data.comments === 'string' ? data.comments.trim() || null : null } : {}),
  }, include: includeRelations });
};
