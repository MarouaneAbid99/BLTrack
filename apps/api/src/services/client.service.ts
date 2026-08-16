import { UserRole } from '@bltrack/shared';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../utils/prisma';

const requireName = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) throw new AppError(400, 'VALIDATION_ERROR', 'name is required');
  return value.trim();
};

const requireBoolean = (value: unknown, field: string): boolean => {
  if (typeof value !== 'boolean') throw new AppError(400, 'VALIDATION_ERROR', `${field} must be a boolean`);
  return value;
};

const objectInput = (input: unknown): Record<string, unknown> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request body must be an object');
  }
  return input as Record<string, unknown>;
};

export const listClients = (role: UserRole) => prisma.client.findMany({
  where: role === UserRole.COURIER ? { isActive: true } : undefined,
  orderBy: { name: 'asc' },
});

export const getClient = async (id: string, role: UserRole) => {
  const client = await prisma.client.findFirst({ where: { id, ...(role === UserRole.COURIER ? { isActive: true } : {}) } });
  if (!client) throw new AppError(404, 'NOT_FOUND', 'Client not found');
  return client;
};

export const createClient = (input: unknown) => {
  const data = objectInput(input);
  return prisma.client.create({
    data: {
      name: requireName(data.name),
      isAccountClient: data.isAccountClient === undefined ? false : requireBoolean(data.isAccountClient, 'isAccountClient'),
    },
  });
};

export const updateClient = async (id: string, input: unknown) => {
  const data = objectInput(input);
  await getClient(id, UserRole.ADMIN);
  if (data.name === undefined && data.isAccountClient === undefined && data.isActive === undefined) {
    throw new AppError(400, 'VALIDATION_ERROR', 'No supported fields were provided');
  }
  return prisma.client.update({ data: {
    ...(data.name !== undefined ? { name: requireName(data.name) } : {}),
    ...(data.isAccountClient !== undefined ? { isAccountClient: requireBoolean(data.isAccountClient, 'isAccountClient') } : {}),
    ...(data.isActive !== undefined ? { isActive: requireBoolean(data.isActive, 'isActive') } : {}),
  }, where: { id } });
};
