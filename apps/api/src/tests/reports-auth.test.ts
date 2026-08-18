import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import { UserRole } from '@bltrack/shared';
import { app } from '../app';
import { createToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { assertDatabaseTestAllowed } from '../utils/database-safety';

test('V2 reports use BL/payment activity, avoirDate, authenticated ownership, and /auth/me', async () => {
  assertDatabaseTestAllowed();
  const suffix = randomUUID();
  const userAId = randomUUID();
  const userBId = randomUUID();
  const clientId = randomUUID();
  const createdBLIds: string[] = [];
  const reportDate = new Date().toISOString().slice(0, 10);
  const reportTimestamp = `${reportDate}T08:00:00.000Z`;
  const server = app.listen(0, '127.0.0.1');

  try {
    await Promise.all([
      prisma.user.create({ data: { id: userAId, username: `report-a-${suffix}`, fullName: 'Report Courier A', passwordHash: 'test-only', role: UserRole.COURIER } }),
      prisma.user.create({ data: { id: userBId, username: `report-b-${suffix}`, fullName: 'Report Courier B', passwordHash: 'test-only', role: UserRole.COURIER } }),
      prisma.client.create({ data: { id: clientId, name: `Report Client ${suffix}`, isAccountClient: false } }),
    ]);
    await new Promise<void>((resolve, reject) => {
      if (server.listening) resolve();
      else { server.once('listening', resolve); server.once('error', reject); }
    });
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const tokenA = createToken({ id: userAId, username: `report-a-${suffix}`, role: UserRole.COURIER });
    const tokenB = createToken({ id: userBId, username: `report-b-${suffix}`, role: UserRole.COURIER });
    const headers = (token: string) => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' });
    const request = async (path: string, init: RequestInit) => {
      const response = await fetch(`${baseUrl}${path}`, init);
      return { response, body: await response.json() as any };
    };
    const expectStatus = (result: Awaited<ReturnType<typeof request>>, status: number) => {
      assert.equal(result.response.status, status, JSON.stringify(result.body));
    };
    const createBL = async (token: string, label: string, blDate: string, amount: number) => {
      const result = await request('/api/bls', {
        method: 'POST', headers: headers(token), body: JSON.stringify({
          blNumber: `REPORT-${label}-${suffix}`, clientId, amount, blDate,
          payment: { amount, status: 'UNPAID' },
        }),
      });
      expectStatus(result, 201);
      createdBLIds.push(result.body.id);
      return result.body;
    };

    const me = await request('/api/auth/me', { headers: headers(tokenA) });
    expectStatus(me, 200);
    assert.equal(me.body.id, userAId);
    assert.equal(me.body.fullName, 'Report Courier A');

    const spoofed = await request('/api/bls', {
      method: 'POST', headers: headers(tokenA), body: JSON.stringify({
        blNumber: `REPORT-SPOOF-${suffix}`, clientId, amount: 25,
        blDate: reportTimestamp, createdById: userBId,
      }),
    });
    expectStatus(spoofed, 400);

    const byBLDate = await createBL(tokenA, 'BLDATE', reportTimestamp, 100);
    const byPaymentDate = await createBL(tokenA, 'PAYMENT', '2020-08-10T00:00:00.000Z', 200);
    const excluded = await createBL(tokenA, 'EXCLUDED', '2020-08-10T00:00:00.000Z', 300);
    const otherCourier = await createBL(tokenB, 'OTHER', reportTimestamp, 400);

    const paid = await request(`/api/bls/${byPaymentDate.id}/payment`, {
      method: 'PUT', headers: headers(tokenA), body: JSON.stringify({
        amount: 200, status: 'PAID', method: 'CHEQUE',
      }),
    });
    expectStatus(paid, 200);
    const unchangedBL = await request(`/api/bls/${byPaymentDate.id}`, { headers: headers(tokenA) });
    expectStatus(unchangedBL, 200);
    assert.equal(unchangedBL.body.blDate, '2020-08-10T00:00:00.000Z');

    const includedAvoir = await request(`/api/bls/${byBLDate.id}/avoirs`, {
      method: 'POST', headers: headers(tokenA), body: JSON.stringify({
        brReference: `BR-IN-${suffix}`, avoirDate: reportTimestamp, amount: 10,
      }),
    });
    expectStatus(includedAvoir, 201);
    const oldAvoir = await request(`/api/bls/${byPaymentDate.id}/avoirs`, {
      method: 'POST', headers: headers(tokenA), body: JSON.stringify({
        brReference: `BR-OLD-${suffix}`, avoirDate: '2020-08-15T08:00:00.000Z', amount: 20,
      }),
    });
    expectStatus(oldAvoir, 201);
    const otherAvoir = await request(`/api/bls/${otherCourier.id}/avoirs`, {
      method: 'POST', headers: headers(tokenB), body: JSON.stringify({
        brReference: `BR-OTHER-${suffix}`, avoirDate: reportTimestamp, amount: 30,
      }),
    });
    expectStatus(otherAvoir, 201);

    const blReport = await request(`/api/reports/bl?dateFrom=${reportDate}&dateTo=${reportDate}`, { headers: headers(tokenA) });
    expectStatus(blReport, 200);
    assert.deepEqual(new Set(blReport.body.data.map((row: any) => row.id)), new Set([byBLDate.id, byPaymentDate.id]));
    assert.ok(!blReport.body.data.some((row: any) => row.id === excluded.id));
    assert.ok(!blReport.body.data.some((row: any) => row.id === otherCourier.id));
    assert.equal(blReport.body.totalBLAmount, '300.00');
    const grossRow = blReport.body.data.find((row: any) => row.id === byBLDate.id);
    assert.equal(grossRow.blAmount, '100.00');
    assert.equal(grossRow.avoirTotal, '10.00');
    assert.equal(grossRow.netAmount, '90.00');
    assert.equal(blReport.body.generatedBy.id, userAId);

    const avoirReport = await request(`/api/reports/avoirs?dateFrom=${reportDate}&dateTo=${reportDate}`, { headers: headers(tokenA) });
    expectStatus(avoirReport, 200);
    assert.deepEqual(avoirReport.body.data.map((row: any) => row.id), [includedAvoir.body.id]);
    assert.equal(avoirReport.body.data[0].avoirAmount, '10.00');
    assert.equal(avoirReport.body.data[0].user.id, userAId);
    assert.equal(avoirReport.body.totalAvoirAmount, '10.00');

    const identityQuery = await request(`/api/reports/bl?dateFrom=${reportDate}&dateTo=${reportDate}&userId=${userBId}`, { headers: headers(tokenA) });
    expectStatus(identityQuery, 400);
    const creatorQuery = await request(`/api/reports/avoirs?dateFrom=${reportDate}&dateTo=${reportDate}&createdById=${userBId}`, { headers: headers(tokenA) });
    expectStatus(creatorQuery, 400);

    await prisma.user.update({ where: { id: userBId }, data: { isActive: false } });
    const inactive = await request('/api/auth/me', { headers: headers(tokenB) });
    expectStatus(inactive, 401);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (createdBLIds.length) {
      await prisma.avoir.deleteMany({ where: { blId: { in: createdBLIds } } });
      await prisma.payment.deleteMany({ where: { blId: { in: createdBLIds } } });
      await prisma.bL.deleteMany({ where: { id: { in: createdBLIds } } });
    }
    await prisma.client.deleteMany({ where: { id: clientId } });
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
    await prisma.$disconnect();
  }
});
