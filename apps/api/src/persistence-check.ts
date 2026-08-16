import { createHmac } from 'crypto';
import { AddressInfo } from 'net';
import { app } from './app';
import { prisma } from './utils/prisma';

const seedPassword = (identity: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET must be configured for persistence verification');
  return createHmac('sha256', secret).update(`bltrack-development-seed:${identity}`).digest('base64url');
};

const requireOk = async (response: Response, action: string): Promise<unknown> => {
  const body = await response.json();
  if (!response.ok) throw new Error(`${action} failed with HTTP ${response.status}`);
  return body;
};

const verify = async (): Promise<void> => {
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
      body: JSON.stringify({ username: 'dev-courier-a', password: seedPassword('dev-courier-a') }),
    }), 'Courier login') as { token?: string };
    if (!login.token) throw new Error('Courier login did not return a token');

    const headers = { authorization: `Bearer ${login.token}` };
    const clients = await requireOk(await fetch(`${baseUrl}/api/clients`, { headers }), 'Client list') as unknown[];
    if (clients.length !== 3) throw new Error(`Expected 3 clients, received ${clients.length}`);

    const blResponse = await requireOk(await fetch(`${baseUrl}/api/bls`, { headers }), 'Courier BL list') as { data?: unknown[] };
    if (blResponse.data?.length !== 2) throw new Error(`Expected 2 courier BLs, received ${blResponse.data?.length ?? 0}`);

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
