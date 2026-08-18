import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import { UserRole } from '@bltrack/shared';
import { app } from '../app';
import { prisma } from '../utils/prisma';
import { assertDatabaseTestAllowed } from '../utils/database-safety';

test('Phase 2C-A monetary and report acceptance workflow', async () => {
  assertDatabaseTestAllowed();
  const suffix = randomUUID();
  const userId = randomUUID();
  const normalClientId = randomUUID();
  const accountClientId = randomUUID();
  const createdBLIds: string[] = [];
  const password = `acceptance-${suffix}`;
  const reportDate = new Date().toISOString().slice(0, 10);
  const currentDate = `${reportDate}T08:00:00.000Z`;
  const server = app.listen(0, '127.0.0.1');

  try {
    await Promise.all([
      prisma.user.create({ data: { id: userId, username: `phase2c-${suffix}`, fullName: 'Phase 2C Courier', passwordHash: await bcrypt.hash(password, 4), role: UserRole.COURIER } }),
      prisma.client.create({ data: { id: normalClientId, name: `Phase 2C Normal ${suffix}`, isAccountClient: false } }),
      prisma.client.create({ data: { id: accountClientId, name: `Phase 2C Account ${suffix}`, isAccountClient: true } }),
    ]);
    await new Promise<void>((resolve, reject) => {
      if (server.listening) resolve();
      else { server.once('listening', resolve); server.once('error', reject); }
    });
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const request = async (path: string, init: RequestInit = {}) => {
      const response = await fetch(`${baseUrl}${path}`, init);
      return { response, body: await response.json() as any };
    };
    const login = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: `phase2c-${suffix}`, password }) });
    assert.equal(login.response.status, 200, JSON.stringify(login.body));
    const headers = { authorization: `Bearer ${login.body.token}`, 'content-type': 'application/json' };
    const api = (path: string, method = 'GET', body?: unknown) => request(path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const expect = (result: Awaited<ReturnType<typeof api>>, status: number) => assert.equal(result.response.status, status, JSON.stringify(result.body));

    const me = await api('/api/auth/me'); expect(me, 200);
    assert.equal(me.body.id, userId); assert.equal(me.body.fullName, 'Phase 2C Courier');

    const createBL = async (label: string, clientId: string, amount: number, blDate = '2020-08-10T00:00:00.000Z') => {
      const result = await api('/api/bls', 'POST', { blNumber: `P2C-${label}-${suffix}`, clientId, amount, blDate });
      expect(result, 201); createdBLIds.push(result.body.id); return result.body;
    };

    const cashBL = await createBL('CASH', normalClientId, 1000);
    const avoir = await api(`/api/bls/${cashBL.id}/avoirs`, 'POST', { brReference: `BR-CASH-${suffix}`, avoirDate: currentDate, amount: 200 }); expect(avoir, 201);
    let detail = await api(`/api/bls/${cashBL.id}`); expect(detail, 200);
    assert.equal(detail.body.netAmount, '800.00'); assert.equal(Number(detail.body.payment.amount), 800); assert.equal(detail.body.payment.status, 'UNPAID');
    const updatedAvoir = await api(`/api/avoirs/${avoir.body.id}`, 'PATCH', { amount: 300 }); expect(updatedAvoir, 200);
    detail = await api(`/api/bls/${cashBL.id}`); expect(detail, 200);
    assert.equal(detail.body.netAmount, '700.00'); assert.equal(Number(detail.body.payment.amount), 700); assert.equal(detail.body.payment.status, 'UNPAID');
    const cash = await api(`/api/bls/${cashBL.id}/payment`, 'PUT', { amount: 700, status: 'PAID', method: 'CASH' }); expect(cash, 200);
    assert.equal(cash.body.method, 'CASH'); assert.equal(cash.body.createdById, userId); assert.ok(cash.body.paidAt); assert.equal(cash.body.status, 'PAID');
    const historicalPaidAt = cash.body.paidAt;

    const paidAvoirEdit = await api(`/api/avoirs/${avoir.body.id}`, 'PATCH', { amount: 350 }); expect(paidAvoirEdit, 200);
    detail = await api(`/api/bls/${cashBL.id}`); expect(detail, 200);
    assert.equal(detail.body.netAmount, '650.00'); assert.equal(Number(detail.body.payment.amount), 700); assert.equal(detail.body.payment.status, 'PAID');
    assert.equal(detail.body.paidAmount, '700.00'); assert.equal(detail.body.paymentDifferenceAmount, '50.00');
    assert.equal(detail.body.payment.paidAt, historicalPaidAt); assert.equal(detail.body.blDate, '2020-08-10T00:00:00.000Z');

    const chequeBL = await createBL('CHEQUE', normalClientId, 500, currentDate);
    const cheque = await api(`/api/bls/${chequeBL.id}/payment`, 'PUT', { amount: 500, status: 'PAID', method: 'CHEQUE' }); expect(cheque, 200);
    assert.equal(cheque.body.method, 'CHEQUE'); assert.ok(cheque.body.paidAt);

    const fullAvoirBL = await createBL('FULL-AVOIR', normalClientId, 400, currentDate);
    const fullAvoir = await api(`/api/bls/${fullAvoirBL.id}/avoirs`, 'POST', { brReference: `BR-FULL-${suffix}`, avoirDate: currentDate, amount: 400 }); expect(fullAvoir, 400);
    assert.match(fullAvoir.body.error.message, /full-value avoir/i);
    const fullDetail = await api(`/api/bls/${fullAvoirBL.id}`); expect(fullDetail, 200);
    assert.equal(fullDetail.body.netAmount, '400.00'); assert.equal(Number(fullDetail.body.payment.amount), 400); assert.equal(fullDetail.body.payment.status, 'UNPAID');

    const accountBL = await createBL('ACCOUNT', accountClientId, 1000, currentDate);
    const accountAvoir = await api(`/api/bls/${accountBL.id}/avoirs`, 'POST', { brReference: `BR-ACCOUNT-${suffix}`, avoirDate: currentDate, amount: 200 }); expect(accountAvoir, 201);
    const accountDetail = await api(`/api/bls/${accountBL.id}`); expect(accountDetail, 200);
    assert.equal(accountDetail.body.netAmount, '800.00'); assert.equal(Number(accountDetail.body.payment.amount), 800);
    assert.equal(accountDetail.body.payment.status, 'EN_COMPTE'); assert.equal(accountDetail.body.payment.method, null); assert.equal(accountDetail.body.payment.paidAt, null);
    const accountCash = await api(`/api/bls/${accountBL.id}/payment`, 'PUT', { amount: 800, status: 'PAID', method: 'CASH' }); expect(accountCash, 400);

    const blReport = await api(`/api/reports/bl?dateFrom=${reportDate}&dateTo=${reportDate}`); expect(blReport, 200);
    const cashRow = blReport.body.data.find((row: any) => row.id === cashBL.id);
    assert.ok(cashRow, 'old BL paid in report period must be included');
    assert.equal(cashRow.blDate, '2020-08-10T00:00:00.000Z'); assert.equal(cashRow.blAmount, '1000.00');
    assert.equal(cashRow.avoirTotal, '350.00'); assert.equal(cashRow.netAmount, '650.00'); assert.equal(cashRow.user.id, userId);
    assert.equal(cashRow.paidAmount, '700.00'); assert.equal(cashRow.paymentDifferenceAmount, '50.00');
    assert.equal(blReport.body.generatedBy.id, userId);
    assert.equal(blReport.body.totalBLAmount, '2900.00');

    const avoirReport = await api(`/api/reports/avoirs?dateFrom=${reportDate}&dateTo=${reportDate}`); expect(avoirReport, 200);
    assert.deepEqual(new Set(avoirReport.body.data.map((row: any) => row.id)), new Set([avoir.body.id, accountAvoir.body.id]));
    assert.equal(avoirReport.body.totalAvoirAmount, '550.00'); assert.equal(avoirReport.body.generatedBy.id, userId);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (createdBLIds.length) {
      await prisma.avoir.deleteMany({ where: { blId: { in: createdBLIds } } });
      await prisma.payment.deleteMany({ where: { blId: { in: createdBLIds } } });
      await prisma.bL.deleteMany({ where: { id: { in: createdBLIds } } });
    }
    await prisma.client.deleteMany({ where: { id: { in: [normalClientId, accountClientId] } } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
