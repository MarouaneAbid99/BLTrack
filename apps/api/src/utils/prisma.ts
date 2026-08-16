import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

let client: PrismaClient | undefined;

const getClient = (): PrismaClient => {
  if (!client) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL must be configured for database operations');
    }
    const database = new URL(databaseUrl);
    client = new PrismaClient({
      adapter: new PrismaMariaDb({
        host: database.hostname,
        port: Number(database.port || 3306),
        user: decodeURIComponent(database.username),
        password: decodeURIComponent(database.password),
        database: database.pathname.slice(1),
        allowPublicKeyRetrieval: true,
      }),
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
