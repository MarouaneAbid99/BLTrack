import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { mariaDbAdapterUrl } from './database-url';

let client: PrismaClient | undefined;

const getClient = (): PrismaClient => {
  if (!client) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL must be configured for database operations');
    client = new PrismaClient({
      adapter: new PrismaMariaDb(mariaDbAdapterUrl(databaseUrl)),
    });
  }
  return client;
};

export const prisma = new Proxy({} as PrismaClient, {
  get: (_target, property) => {
    const value = Reflect.get(getClient(), property);
    return typeof value === 'function' ? value.bind(getClient()) : value;
  },
});
