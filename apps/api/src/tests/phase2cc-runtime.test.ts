import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, test } from 'node:test';
import bcrypt from 'bcryptjs';
import { developmentSeedPassword } from '../utils/development-seed';
import { prisma } from '../utils/prisma';
import { assertDatabaseTestAllowed } from '../utils/database-safety';

test('Phase 2C-C development credential and database integrity', async () => {
  assertDatabaseTestAllowed();
  const expectedBLCount = Number(process.env.PHASE1_EXPECTED_BL_COUNT);
  const expectedBLHash = process.env.PHASE1_EXPECTED_BL_ID_HASH;
  assert.ok(Number.isInteger(expectedBLCount) && expectedBLCount >= 0, 'PHASE1_EXPECTED_BL_COUNT is required');
  assert.ok(expectedBLHash, 'PHASE1_EXPECTED_BL_ID_HASH is required');

  const [user, users, blIds, paymentCount, avoirCount, clientCount] = await Promise.all([
    prisma.user.findUnique({ where: { username: 'dev-courier-a' } }),
    prisma.user.findMany({ select: { username: true, role: true, isActive: true }, orderBy: { username: 'asc' } }),
    prisma.bL.findMany({ select: { id: true }, orderBy: { id: 'asc' } }),
    prisma.payment.count(),
    prisma.avoir.count(),
    prisma.client.count(),
  ]);

  assert.ok(user, 'dev-courier-a development user is missing');
  assert.equal(user.isActive, true, 'dev-courier-a must be active');
  assert.equal(await bcrypt.compare(developmentSeedPassword(user.username), user.passwordHash), true,
    'dev-courier-a password does not match the development seed contract');

  const blHash = createHash('sha256').update(blIds.map(({ id }) => id).join(',')).digest('hex');
  assert.equal(blIds.length, expectedBLCount, 'BL count changed');
  assert.equal(blHash, expectedBLHash, 'Original BL ID hash changed');

  console.log(JSON.stringify({
    users,
    counts: { bl: blIds.length, payment: paymentCount, avoir: avoirCount, client: clientCount },
    blIdHash: blHash,
  }));
});

after(async () => prisma.$disconnect());
