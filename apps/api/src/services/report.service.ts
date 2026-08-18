import { Prisma } from '@prisma/client';
import { UserRole } from '@bltrack/shared';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../utils/prisma';
import { casablancaCalendarRange, casablancaDateBoundary, nextCasablancaDateBoundary } from '../utils/casablanca-time';

const amount = (value: Prisma.Decimal | null | undefined): number => Number(value?.toFixed(2) ?? '0');
const protectedIdentityFields = ['userId', 'courierId', 'createdById', 'courierName'];

const requiredRange = (query: Record<string, unknown>) => {
  const spoofed = protectedIdentityFields.find((field) => Object.prototype.hasOwnProperty.call(query, field));
  if (spoofed) throw new AppError(400, 'VALIDATION_ERROR', `${spoofed} is server-owned and must not be supplied`);
  try { return casablancaCalendarRange(query.dateFrom, query.dateTo); }
  catch (error) { throw new AppError(400, 'VALIDATION_ERROR', error instanceof Error ? error.message : 'Invalid report period'); }
};

const reportUser = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, username: true, fullName: true, role: true } });
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Authenticated user no longer exists');
  return user;
};

export const blReport = async (query: Record<string, unknown>, auth: { id: string; role: UserRole }) => {
  const period = requiredRange(query);
  const activityRange = { gte: period.start, lt: period.end };
  const where: Prisma.BLWhereInput = {
    ...(auth.role === UserRole.COURIER ? { createdById: auth.id } : {}),
    OR: [
      { blDate: activityRange },
      { payment: { is: { paidAt: activityRange } } },
    ],
  };
  const rows = await prisma.bL.findMany({
    where,
    include: {
      client: true,
      createdBy: { select: { id: true, username: true, fullName: true } },
      payment: true,
      avoirs: { select: { amount: true } },
    },
    orderBy: [{ blDate: 'asc' }, { blNumber: 'asc' }],
  });
  const data = rows.map((bl) => {
    const avoirTotal = bl.avoirs.reduce((total, avoir) => total.plus(avoir.amount), new Prisma.Decimal(0));
    const netAmount = bl.amount.minus(avoirTotal);
    const paidAmount = bl.payment?.status === 'PAID' ? bl.payment.amount : null;
    const paymentDifference = paidAmount?.minus(netAmount) ?? null;
    return {
      id: bl.id,
      blNumber: bl.blNumber,
      client: { id: bl.client.id, name: bl.client.name },
      blDate: bl.blDate,
      blAmount: bl.amount.toFixed(2),
      avoirTotal: avoirTotal.toFixed(2),
      netAmount: netAmount.toFixed(2),
      paidAmount: paidAmount?.toFixed(2) ?? null,
      paymentDifferenceAmount: paymentDifference?.toFixed(2) ?? null,
      paymentStatus: bl.payment?.status ?? null,
      paymentMethod: bl.payment?.method ?? null,
      paidAt: bl.payment?.paidAt ?? null,
      user: bl.createdBy,
    };
  });
  const totalBLAmount = rows.reduce((total, bl) => total.plus(bl.amount), new Prisma.Decimal(0));
  return {
    period: { dateFrom: period.dateFrom, dateTo: period.dateTo },
    generatedBy: await reportUser(auth.id),
    data,
    totalBLAmount: totalBLAmount.toFixed(2),
  };
};

export const avoirReport = async (query: Record<string, unknown>, auth: { id: string; role: UserRole }) => {
  const period = requiredRange(query);
  const rows = await prisma.avoir.findMany({
    where: {
      avoirDate: { gte: period.start, lt: period.end },
      ...(auth.role === UserRole.COURIER ? { createdById: auth.id } : {}),
    },
    include: {
      bl: { select: { id: true, blNumber: true } },
      client: { select: { id: true, name: true } },
      createdBy: { select: { id: true, username: true, fullName: true } },
    },
    orderBy: [{ avoirDate: 'asc' }, { brReference: 'asc' }],
  });
  const totalAvoirAmount = rows.reduce((total, avoir) => total.plus(avoir.amount), new Prisma.Decimal(0));
  return {
    period: { dateFrom: period.dateFrom, dateTo: period.dateTo },
    generatedBy: await reportUser(auth.id),
    data: rows.map((avoir) => ({
      id: avoir.id,
      brReference: avoir.brReference,
      bl: avoir.bl,
      client: avoir.client,
      avoirDate: avoir.avoirDate,
      avoirAmount: avoir.amount.toFixed(2),
      user: avoir.createdBy,
    })),
    totalAvoirAmount: totalAvoirAmount.toFixed(2),
  };
};

const range = (query: Record<string, unknown>): Prisma.BLWhereInput => {
  if (query.dateFrom === undefined && query.dateTo === undefined) return {};
  try {
    const start = query.dateFrom === undefined ? undefined : casablancaDateBoundary(query.dateFrom, 'dateFrom');
    const end = query.dateTo === undefined ? undefined : nextCasablancaDateBoundary(query.dateTo, 'dateTo');
    return { deliveryDate: { ...(start ? { gte: start } : {}), ...(end ? { lt: end } : {}) } };
  } catch (error) { throw new AppError(400, 'VALIDATION_ERROR', error instanceof Error ? error.message : 'Invalid report period'); }
};
const pagination = (query: Record<string, unknown>) => ({ page: Math.max(1, Number(query.page) || 1), limit: Math.min(100, Math.max(1, Number(query.limit) || 20)) });
const totals = () => ({ totalBLs: 0, totalAmount: 0, cashAmount: 0, chequeAmount: 0, accountAmount: 0, paidAmount: 0, pendingAmount: 0 });
const apply = (target: ReturnType<typeof totals>, entry: { paymentMethod: string | null; paymentStatus: string; _count: { _all: number }; _sum: { amount: Prisma.Decimal | null } }) => {
  const value = amount(entry._sum.amount); target.totalBLs += entry._count._all; target.totalAmount += value;
  if (entry.paymentMethod === 'CASH') target.cashAmount += value;
  if (entry.paymentMethod === 'CHEQUE') target.chequeAmount += value;
  if (entry.paymentMethod === 'ACCOUNT') target.accountAmount += value;
  if (entry.paymentStatus === 'PAID') target.paidAmount += value; else target.pendingAmount += value;
};

export const collections = async (query: Record<string, unknown>) => {
  const periodWhere = range(query); const where: Prisma.BLWhereInput = { ...periodWhere, paymentStatus: 'PENDING' };
  const { page, limit } = pagination(query);
  const [data, total, outstanding, breakdown, pendingClients] = await prisma.$transaction([
    prisma.bL.findMany({ where, include: { client: true, courier: { select: { id: true, username: true, fullName: true, isActive: true } } }, orderBy: { deliveryDate: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.bL.count({ where }), prisma.bL.aggregate({ where, _sum: { amount: true } }),
    prisma.bL.groupBy({ by: ['paymentMethod', 'paymentStatus'], where: periodWhere, orderBy: { paymentMethod: 'asc' }, _count: { _all: true }, _sum: { amount: true } }),
    prisma.bL.groupBy({ by: ['clientId'], where, orderBy: { clientId: 'asc' }, _count: { _all: true }, _sum: { amount: true } }),
  ]);
  const period = totals(); (breakdown as Array<{ paymentMethod: string | null; paymentStatus: string; _count: { _all: number }; _sum: { amount: Prisma.Decimal | null } }>).forEach((entry) => apply(period, entry));
  const typedPending = pendingClients as Array<{ clientId: string; _count: { _all: number }; _sum: { amount: Prisma.Decimal | null } }>;
  const clientIds = typedPending.map((entry) => entry.clientId);
  const clients = await prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true, isAccountClient: true } });
  const names = new Map(clients.map((client) => [client.id, client]));
  const pendingByClient = typedPending.map((entry) => ({ client: names.get(entry.clientId), pendingBLs: entry._count._all, pendingAmount: amount(entry._sum.amount) })).sort((a, b) => b.pendingAmount - a.pendingAmount);
  return { data, totalOutstanding: amount(outstanding._sum.amount), period, pendingClients: pendingByClient, pagination: { page, limit, total, totalPages: total ? Math.ceil(total / limit) : 0 } };
};

export const clientFinancials = async (query: Record<string, unknown>) => {
  const grouped = await prisma.bL.groupBy({ by: ['clientId', 'paymentMethod', 'paymentStatus'], where: range(query), _count: { _all: true }, _sum: { amount: true } });
  const clients = await prisma.client.findMany({ where: { id: { in: [...new Set(grouped.map((entry) => entry.clientId))] } }, select: { id: true, name: true, isAccountClient: true, isActive: true } });
  const byId = new Map(clients.map((client) => [client.id, { client, ...totals() }]));
  grouped.forEach((entry) => apply(byId.get(entry.clientId)!, entry));
  return [...byId.values()].sort((a, b) => b.totalAmount - a.totalAmount);
};

export const courierPerformance = async (query: Record<string, unknown>) => {
  const grouped = await prisma.bL.groupBy({ by: ['courierId', 'paymentMethod', 'paymentStatus'], where: range(query), _count: { _all: true }, _sum: { amount: true } });
  const couriers = await prisma.user.findMany({ where: { id: { in: [...new Set(grouped.map((entry) => entry.courierId))] } }, select: { id: true, username: true, fullName: true, isActive: true } });
  const byId = new Map(couriers.map((courier) => [courier.id, { courier, ...totals() }]));
  grouped.forEach((entry) => apply(byId.get(entry.courierId)!, entry));
  return [...byId.values()].sort((a, b) => b.totalAmount - a.totalAmount);
};
