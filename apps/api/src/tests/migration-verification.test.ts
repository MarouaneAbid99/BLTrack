import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { assertDatabaseTestAllowed } from '../utils/database-safety';

type CountRow = { count: bigint | number };

const count = async (sql: Prisma.Sql): Promise<number> => {
  const rows = await prisma.$queryRaw<CountRow[]>(sql);
  return Number(rows[0]?.count ?? 0);
};

test('Phase 1 migration preserves and correctly backfills legacy BL data', async () => {
  assertDatabaseTestAllowed();
  const expectedCount = Number(process.env.PHASE1_EXPECTED_BL_COUNT);
  const expectedHash = process.env.PHASE1_EXPECTED_BL_ID_HASH;
  assert.ok(Number.isInteger(expectedCount) && expectedCount >= 0, 'PHASE1_EXPECTED_BL_COUNT is required');
  assert.ok(expectedHash, 'PHASE1_EXPECTED_BL_ID_HASH is required');

  const blCount = await count(Prisma.sql`SELECT COUNT(*) AS count FROM BL`);
  const paymentCount = await count(Prisma.sql`SELECT COUNT(*) AS count FROM Payment`);
  const missingBackfill = await count(Prisma.sql`SELECT COUNT(*) AS count FROM BL WHERE blDate IS NULL OR createdById IS NULL`);
  const identityMismatch = await count(Prisma.sql`SELECT COUNT(*) AS count FROM BL WHERE createdById <> courierId`);
  const paidMismatch = await count(Prisma.sql`
    SELECT COUNT(*) AS count FROM BL
    LEFT JOIN Payment ON Payment.blId = BL.id
    WHERE BL.paymentStatus = 'PAID'
      AND (Payment.status <> 'PAID' OR Payment.method <> BL.paymentMethod OR Payment.paidAt IS NOT NULL)
  `);
  const accountMismatch = await count(Prisma.sql`
    SELECT COUNT(*) AS count FROM BL
    LEFT JOIN Payment ON Payment.blId = BL.id
    WHERE BL.paymentStatus = 'PENDING' AND BL.paymentMethod = 'ACCOUNT'
      AND (Payment.status <> 'EN_COMPTE' OR Payment.method IS NOT NULL OR Payment.paidAt IS NOT NULL)
  `);
  const unpaidMismatch = await count(Prisma.sql`
    SELECT COUNT(*) AS count FROM BL
    LEFT JOIN Payment ON Payment.blId = BL.id
    WHERE BL.paymentStatus = 'PENDING' AND (BL.paymentMethod IS NULL OR BL.paymentMethod <> 'ACCOUNT')
      AND (Payment.status <> 'UNPAID' OR Payment.method IS NOT NULL OR Payment.paidAt IS NOT NULL)
  `);
  const invalidAvoir = await count(Prisma.sql`SELECT COUNT(*) AS count FROM Avoir WHERE amount <= 0`);
  const hashRows = await prisma.$queryRaw<Array<{ idHash: string }>>(Prisma.sql`
    SELECT SHA2(GROUP_CONCAT(id ORDER BY id SEPARATOR ','), 256) AS idHash FROM BL
  `);

  assert.equal(blCount, expectedCount, 'BL count changed during migration');
  assert.equal(hashRows[0]?.idHash, expectedHash, 'BL IDs changed during migration');
  assert.equal(paymentCount, blCount, 'Every legacy BL must have one migrated Payment');
  assert.equal(missingBackfill, 0, 'blDate/createdById backfill is incomplete');
  assert.equal(identityMismatch, 0, 'Legacy createdById must be backfilled from courierId');
  assert.equal(paidMismatch, 0, 'Paid legacy records were not migrated safely');
  assert.equal(accountMismatch, 0, 'ACCOUNT records were not converted to EN_COMPTE');
  assert.equal(unpaidMismatch, 0, 'Normal pending records were not converted to UNPAID');
  assert.equal(invalidAvoir, 0, 'Avoir storage contains a non-positive amount');
});

after(async () => prisma.$disconnect());
