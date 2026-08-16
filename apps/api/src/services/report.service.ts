import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../utils/prisma';

const amount = (value: Prisma.Decimal | null | undefined): number => Number(value?.toFixed(2) ?? '0');
const range = (query: Record<string, unknown>): Prisma.BLWhereInput => {
  const parse = (value: unknown, field: string) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AppError(400, 'VALIDATION_ERROR', `${field} must use YYYY-MM-DD`);
    return new Date(`${value}T00:00:00.000Z`);
  };
  if (query.dateFrom === undefined && query.dateTo === undefined) return {};
  const start = query.dateFrom === undefined ? undefined : parse(query.dateFrom, 'dateFrom');
  const end = query.dateTo === undefined ? undefined : parse(query.dateTo, 'dateTo');
  if (end) end.setUTCDate(end.getUTCDate() + 1);
  return { deliveryDate: { ...(start ? { gte: start } : {}), ...(end ? { lt: end } : {}) } };
};
const pagination = (query: Record<string, unknown>) => ({ page: Math.max(1, Number(query.page) || 1), limit: Math.min(100, Math.max(1, Number(query.limit) || 20)) });
const totals = () => ({ totalBLs: 0, totalAmount: 0, cashAmount: 0, chequeAmount: 0, accountAmount: 0, paidAmount: 0, pendingAmount: 0 });
const apply = (target: ReturnType<typeof totals>, entry: { paymentMethod: string; paymentStatus: string; _count: { _all: number }; _sum: { amount: Prisma.Decimal | null } }) => {
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
  const period = totals(); (breakdown as Array<{ paymentMethod: string; paymentStatus: string; _count: { _all: number }; _sum: { amount: Prisma.Decimal | null } }>).forEach((entry) => apply(period, entry));
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
