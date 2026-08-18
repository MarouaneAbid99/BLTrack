import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PaymentMethod, PaymentStatus, UserRole } from '@bltrack/shared';
import { avoirReport, blReport } from '../services/report.service';
import { prisma } from '../utils/prisma';
import { assertDatabaseTestAllowed } from '../utils/database-safety';

test('V2 reports apply Casablanca boundaries to BL, payment, and avoir activity', async () => {
  assertDatabaseTestAllowed();
  const suffix = randomUUID();
  const userId = randomUUID();
  const clientId = randomUUID();
  const blIds: string[] = [];
  try {
    await prisma.user.create({ data: { id: userId, username: `tz-${suffix}`, fullName: 'Timezone Courier', passwordHash: 'test-only', role: UserRole.COURIER } });
    await prisma.client.create({ data: { id: clientId, name: `Timezone Client ${suffix}`, isAccountClient: false } });
    const create = async (label: string, blDate: string, status: PaymentStatus, paidAt: string | null) => {
      const row = await prisma.bL.create({ data: {
        blNumber: `TZ-${label}-${suffix}`, clientId, amount: 100,
        blDate: new Date(blDate), deliveryDate: new Date(blDate), createdById: userId, courierId: userId,
        paymentStatus: status === PaymentStatus.PAID ? 'PAID' : 'PENDING', paymentMethod: status === PaymentStatus.PAID ? 'CASH' : null,
        payment: { create: { amount: 100, status, method: status === PaymentStatus.PAID ? PaymentMethod.CASH : null, paidAt: paidAt ? new Date(paidAt) : null, createdById: userId } },
      } });
      blIds.push(row.id); return row;
    };
    const byBLDate = await create('BL-IN', '2026-08-16T23:00:00.000Z', PaymentStatus.UNPAID, null);
    const byPaymentDate = await create('PAY-IN', '2020-08-10T00:00:00.000Z', PaymentStatus.PAID, '2026-08-17T22:59:59.000Z');
    await create('END-OUT', '2026-08-17T23:00:00.000Z', PaymentStatus.UNPAID, null);
    await create('PAY-OUT', '2020-08-10T00:00:00.000Z', PaymentStatus.PAID, '2026-08-17T23:00:00.000Z');

    const insideAvoir = await prisma.avoir.create({ data: { brReference: `TZ-BR-IN-${suffix}`, blId: byBLDate.id, clientId, avoirDate: new Date('2026-08-16T23:00:00.000Z'), amount: 10, createdById: userId } });
    await prisma.avoir.create({ data: { brReference: `TZ-BR-OUT-${suffix}`, blId: byBLDate.id, clientId, avoirDate: new Date('2026-08-17T23:00:00.000Z'), amount: 5, createdById: userId } });

    const auth = { id: userId, role: UserRole.COURIER };
    const bl = await blReport({ dateFrom: '2026-08-17', dateTo: '2026-08-17' }, auth);
    assert.deepEqual(new Set(bl.data.map((row) => row.id)), new Set([byBLDate.id, byPaymentDate.id]));
    assert.equal(bl.data.find((row) => row.id === byPaymentDate.id)?.blDate.toISOString(), '2020-08-10T00:00:00.000Z');
    const avoirs = await avoirReport({ dateFrom: '2026-08-17', dateTo: '2026-08-17' }, auth);
    assert.deepEqual(avoirs.data.map((row) => row.id), [insideAvoir.id]);
  } finally {
    if (blIds.length) {
      await prisma.avoir.deleteMany({ where: { blId: { in: blIds } } });
      await prisma.payment.deleteMany({ where: { blId: { in: blIds } } });
      await prisma.bL.deleteMany({ where: { id: { in: blIds } } });
    }
    await prisma.client.deleteMany({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
