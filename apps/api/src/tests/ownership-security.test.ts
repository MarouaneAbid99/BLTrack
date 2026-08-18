import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import { UserRole } from '@bltrack/shared';
import { app } from '../app';
import { createToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { assertDatabaseTestAllowed } from '../utils/database-safety';

test('Phase 1 API enforces ownership, server identity, payment states, and positive avoirs', async () => {
  assertDatabaseTestAllowed();
  const suffix = randomUUID();
  const userAId = randomUUID();
  const userBId = randomUUID();
  const normalClientId = randomUUID();
  const accountClientId = randomUUID();
  const createdBLIds: string[] = [];
  const server = app.listen(0, '127.0.0.1');

  try {
    await Promise.all([
      prisma.user.create({ data: { id: userAId, username: `phase1-a-${suffix}`, fullName: 'Phase 1 Courier A', passwordHash: 'test-only', role: UserRole.COURIER } }),
      prisma.user.create({ data: { id: userBId, username: `phase1-b-${suffix}`, fullName: 'Phase 1 Courier B', passwordHash: 'test-only', role: UserRole.COURIER } }),
      prisma.client.create({ data: { id: normalClientId, name: `Phase 1 Normal ${suffix}`, isAccountClient: false } }),
      prisma.client.create({ data: { id: accountClientId, name: `Phase 1 Account ${suffix}`, isAccountClient: true } }),
    ]);
    await new Promise<void>((resolve, reject) => {
      if (server.listening) resolve();
      else { server.once('listening', resolve); server.once('error', reject); }
    });
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const headersA = { authorization: `Bearer ${createToken({ id: userAId, username: `phase1-a-${suffix}`, role: UserRole.COURIER })}`, 'content-type': 'application/json' };
    const headersB = { authorization: `Bearer ${createToken({ id: userBId, username: `phase1-b-${suffix}`, role: UserRole.COURIER })}`, 'content-type': 'application/json' };
    const request = async (path: string, init: RequestInit) => {
      const response = await fetch(`${baseUrl}${path}`, init);
      return { response, body: await response.json() as any };
    };

    const spoofed = await request('/api/bls', { method: 'POST', headers: headersA, body: JSON.stringify({
      blNumber: `PHASE1-SPOOF-${suffix}`, clientId: normalClientId, amount: 100, blDate: '2026-08-16T00:00:00.000Z', createdById: userBId,
    }) });
    assert.equal(spoofed.response.status, 400);

    const created = await request('/api/bls', { method: 'POST', headers: headersA, body: JSON.stringify({
      blNumber: `PHASE1-BL-${suffix}`, clientId: normalClientId, amount: 1000, blDate: '2026-08-10T00:00:00.000Z',
      payment: { amount: 1000, status: 'UNPAID' },
    }) });
    assert.equal(created.response.status, 201);
    createdBLIds.push(created.body.id);
    assert.equal(created.body.createdById, userAId);
    assert.equal(created.body.courierId, userAId);
    assert.equal(created.body.payment.status, 'UNPAID');
    assert.equal(created.body.payment.method, null);
    assert.equal(created.body.payment.paidAt, null);

    const filteredList = await request(`/api/bls?search=${encodeURIComponent(created.body.blNumber)}&status=UNPAID`, { headers: headersA });
    assert.equal(filteredList.response.status, 200);
    assert.deepEqual(filteredList.body.data.map((bl: any) => bl.id), [created.body.id]);

    const forbiddenRead = await request(`/api/bls/${created.body.id}`, { headers: headersB });
    assert.equal(forbiddenRead.response.status, 404);

    const spoofedAvoir = await request(`/api/bls/${created.body.id}/avoirs`, { method: 'POST', headers: headersA, body: JSON.stringify({
      brReference: `BR-SPOOF-${suffix}`, avoirDate: '2026-08-11T00:00:00.000Z', amount: 100, clientId: accountClientId,
    }) });
    assert.equal(spoofedAvoir.response.status, 400);

    const negativeAvoir = await request(`/api/bls/${created.body.id}/avoirs`, { method: 'POST', headers: headersA, body: JSON.stringify({
      brReference: `BR-NEG-${suffix}`, avoirDate: '2026-08-11T00:00:00.000Z', amount: -1,
    }) });
    assert.equal(negativeAvoir.response.status, 400);

    const avoir = await request(`/api/bls/${created.body.id}/avoirs`, { method: 'POST', headers: headersA, body: JSON.stringify({
      brReference: `BR-${suffix}`, avoirDate: '2026-08-11T00:00:00.000Z', amount: 200,
    }) });
    assert.equal(avoir.response.status, 201);
    assert.equal(avoir.body.clientId, normalClientId);
    assert.equal(avoir.body.createdById, userAId);

    const detail = await request(`/api/bls/${created.body.id}`, { headers: headersA });
    assert.equal(detail.body.totalAvoirAmount, '200.00');
    assert.equal(detail.body.netAmount, '800.00');
    assert.equal(Number(detail.body.payment.amount), 800);

    const edited = await request(`/api/bls/${created.body.id}`, { method: 'PATCH', headers: headersA, body: JSON.stringify({
      blNumber: `PHASE1-BL-EDITED-${suffix}`, clientId: normalClientId, amount: 1000,
      blDate: '2026-08-09T00:00:00.000Z', comments: 'mobile edit',
    }) });
    assert.equal(edited.response.status, 200);
    assert.equal(edited.body.blNumber, `PHASE1-BL-EDITED-${suffix}`);
    assert.equal(edited.body.blDate, '2026-08-09T00:00:00.000Z');
    assert.equal(edited.body.comments, 'mobile edit');

    const spoofedPaidAt = await request(`/api/bls/${created.body.id}/payment`, { method: 'PUT', headers: headersA, body: JSON.stringify({ amount: 800, status: 'PAID', method: 'CASH', paidAt: '2026-08-16T12:00:00.000Z' }) });
    assert.equal(spoofedPaidAt.response.status, 400);
    const invalidUnpaid = await request(`/api/bls/${created.body.id}/payment`, { method: 'PUT', headers: headersA, body: JSON.stringify({ amount: 800, status: 'UNPAID', method: 'CASH' }) });
    assert.equal(invalidUnpaid.response.status, 400);
    const beforePayment = Date.now();
    const paid = await request(`/api/bls/${created.body.id}/payment`, { method: 'PUT', headers: headersA, body: JSON.stringify({ amount: 800, status: 'PAID', method: 'CASH' }) });
    assert.equal(paid.response.status, 200);
    assert.equal(paid.body.method, 'CASH');
    assert.ok(Date.parse(paid.body.paidAt) >= beforePayment);
    assert.ok(Date.parse(paid.body.paidAt) <= Date.now());

    const accountBL = await request('/api/bls', { method: 'POST', headers: headersA, body: JSON.stringify({
      blNumber: `PHASE1-ACCOUNT-${suffix}`, clientId: accountClientId, amount: 500, blDate: '2026-08-12T00:00:00.000Z',
    }) });
    assert.equal(accountBL.response.status, 201);
    createdBLIds.push(accountBL.body.id);
    assert.equal(accountBL.body.payment.status, 'EN_COMPTE');
    assert.equal(accountBL.body.payment.method, null);
    assert.equal(accountBL.body.payment.paidAt, null);

    const summary = await request('/api/bls/summary', { headers: headersA });
    assert.equal(summary.response.status, 200);
    assert.deepEqual(summary.body, { totalBLs: 2, totalAmount: '1500.00', paid: 1, unpaid: 0, enCompte: 1 });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (createdBLIds.length) {
      await prisma.avoir.deleteMany({ where: { blId: { in: createdBLIds } } });
      await prisma.payment.deleteMany({ where: { blId: { in: createdBLIds } } });
      await prisma.bL.deleteMany({ where: { id: { in: createdBLIds } } });
    }
    await prisma.client.deleteMany({ where: { id: { in: [normalClientId, accountClientId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
    await prisma.$disconnect();
  }
});
