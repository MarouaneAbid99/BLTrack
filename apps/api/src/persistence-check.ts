import { AddressInfo } from 'net';
import { app } from './app';
import { developmentSeedPassword } from './utils/development-seed';
import { assertPersistenceCheckAllowed } from './utils/database-safety';
import { prisma } from './utils/prisma';

const requireOk = async (response: Response, action: string): Promise<unknown> => {
  const body = await response.json();
  if (!response.ok) throw new Error(`${action} failed with HTTP ${response.status}`);
  return body;
};

const verify = async (): Promise<void> => {
  assertPersistenceCheckAllowed();
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const login = await requireOk(await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'dev-courier-a', password: developmentSeedPassword('dev-courier-a') }),
    }), 'Courier login') as { token?: string };
    if (!login.token) throw new Error('Courier login did not return a token');

    const headers = { authorization: `Bearer ${login.token}` };
    const clients = await requireOk(await fetch(`${baseUrl}/api/clients`, { headers }), 'Client list') as unknown[];
    if (clients.length !== 3) throw new Error(`Expected 3 clients, received ${clients.length}`);

    const blResponse = await requireOk(await fetch(`${baseUrl}/api/bls`, { headers }), 'Courier BL list') as {
      data?: Array<{ blNumber?: string }>;
    };
    const visibleNumbers = new Set(blResponse.data?.map(({ blNumber }) => blNumber));
    for (const expectedNumber of ['DEV-BL-1001', 'DEV-BL-1003']) {
      if (!visibleNumbers.has(expectedNumber)) throw new Error(`Courier BL list is missing ${expectedNumber}`);
    }

    const summary = await requireOk(await fetch(`${baseUrl}/api/dashboard/daily-summary?date=2026-08-09`, { headers }), 'Daily summary') as { totalBLs?: number; totalAmount?: string; paidAmount?: string; pendingAmount?: string };
    if (summary.totalBLs !== 2 || summary.totalAmount !== '1890.50' || summary.paidAmount !== '1250.50' || summary.pendingAmount !== '640.00') {
      throw new Error('Daily summary did not match the seeded courier records');
    }

    console.log('API persistence verification passed: login, clients, courier BLs, and daily summary');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }
};

verify().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'API persistence verification failed');
  process.exitCode = 1;
});
