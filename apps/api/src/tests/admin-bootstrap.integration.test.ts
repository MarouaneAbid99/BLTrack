import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { UserRole } from '@bltrack/shared';
import { createFirstProductionAdmin } from '../services/admin-bootstrap.service';
import { assertDedicatedTestDatabase } from '../utils/database-safety';
import { verifyPassword } from '../utils/password';
import { prisma } from '../utils/prisma';

const count = async (table: 'Client' | 'BL' | 'Payment' | 'Avoir'): Promise<number> => {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
    `SELECT COUNT(*) AS count FROM \`${table}\``,
  );
  return Number(rows[0]?.count ?? 0);
};

test('production admin bootstrap is one-time and isolated on a dedicated test database', async () => {
  assertDedicatedTestDatabase();
  assert.equal(await prisma.user.count(), 0, 'Dedicated bootstrap test database must start without Users');

  const existingPasswordHash = 'test-only-existing-hash';
  const existing = await prisma.user.create({
    data: {
      id: randomUUID(),
      username: `existing-${randomBytes(6).toString('hex')}`,
      fullName: 'Existing Test User',
      passwordHash: existingPasswordHash,
      role: UserRole.COURIER,
      isActive: false,
    },
  });

  const candidate = {
    username: `admin-${randomBytes(6).toString('hex')}`,
    fullName: 'Production Test Administrator',
    password: `${randomBytes(18).toString('base64url')}Aa1!`,
  };
  await assert.rejects(
    createFirstProductionAdmin(candidate),
    /bootstrap refused: a User already exists/,
  );
  assert.deepEqual(await prisma.user.findUnique({ where: { id: existing.id } }), existing);
  await prisma.user.delete({ where: { id: existing.id } });

  const created = await createFirstProductionAdmin(candidate);
  const stored = await prisma.user.findUniqueOrThrow({ where: { id: created.id } });
  assert.equal(await prisma.user.count(), 1);
  assert.equal(stored.role, UserRole.ADMIN);
  assert.equal(stored.isActive, true);
  assert.notEqual(stored.passwordHash, candidate.password);
  assert.equal(await verifyPassword(candidate.password, stored.passwordHash), true);

  await assert.rejects(
    createFirstProductionAdmin({ ...candidate, username: `second-${randomBytes(6).toString('hex')}` }),
    /bootstrap refused: a User already exists/,
  );
  assert.deepEqual(await prisma.user.findUnique({ where: { id: created.id } }), stored);
  assert.equal(await count('Client'), 0);
  assert.equal(await count('BL'), 0);
  assert.equal(await count('Payment'), 0);
  assert.equal(await count('Avoir'), 0);
});

after(async () => {
  if (process.env.BLTRACK_DEDICATED_TEST_DATABASE === 'true') {
    await prisma.user.deleteMany();
  }
  await prisma.$disconnect();
});
