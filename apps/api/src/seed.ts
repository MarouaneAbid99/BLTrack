import { LegacyPaymentMethod, LegacyPaymentStatus, PaymentMethod, PaymentStatus, UserRole } from '@bltrack/shared';
import { prisma } from './utils/prisma';
import { developmentSeedPassword } from './utils/development-seed';
import { assertDevelopmentSeedAllowed } from './utils/database-safety';
import { hashPassword } from './utils/password';

const hashSeedPassword = (identity: string): Promise<string> =>
  hashPassword(developmentSeedPassword(identity));

const seed = async (): Promise<void> => {
  assertDevelopmentSeedAllowed();
  const [adminHash, courierAHash, courierBHash] = await Promise.all([
    hashSeedPassword('dev-admin'),
    hashSeedPassword('dev-courier-a'),
    hashSeedPassword('dev-courier-b'),
  ]);

  const admin = await prisma.user.upsert({
    where: { username: 'dev-admin' },
    update: { fullName: 'Development Administrator', passwordHash: adminHash, role: UserRole.ADMIN, isActive: true },
    create: { username: 'dev-admin', fullName: 'Development Administrator', passwordHash: adminHash, role: UserRole.ADMIN },
  });
  const courierA = await prisma.user.upsert({
    where: { username: 'dev-courier-a' },
    update: { fullName: 'Development Courier A', passwordHash: courierAHash, role: UserRole.COURIER, isActive: true },
    create: { username: 'dev-courier-a', fullName: 'Development Courier A', passwordHash: courierAHash, role: UserRole.COURIER },
  });
  const courierB = await prisma.user.upsert({
    where: { username: 'dev-courier-b' },
    update: { fullName: 'Development Courier B', passwordHash: courierBHash, role: UserRole.COURIER, isActive: true },
    create: { username: 'dev-courier-b', fullName: 'Development Courier B', passwordHash: courierBHash, role: UserRole.COURIER },
  });

  const [cashClient, chequeClient, accountClient] = await Promise.all([
    prisma.client.upsert({ where: { name: 'Atlas Fictional Supplies' }, update: { isAccountClient: false, isActive: true }, create: { name: 'Atlas Fictional Supplies', isAccountClient: false } }),
    prisma.client.upsert({ where: { name: 'Blue Harbor Demo Trading' }, update: { isAccountClient: false, isActive: true }, create: { name: 'Blue Harbor Demo Trading', isAccountClient: false } }),
    prisma.client.upsert({ where: { name: 'Cedar Account Demo' }, update: { isAccountClient: true, isActive: true }, create: { name: 'Cedar Account Demo', isAccountClient: true } }),
  ]);

  const deliveryDate = new Date('2026-08-09T10:00:00.000Z');
  const [cashBL, chequeBL, accountBL] = await Promise.all([
    prisma.bL.upsert({
      where: { blNumber: 'DEV-BL-1001' },
      update: { clientId: cashClient.id, courierId: courierA.id, createdById: courierA.id, amount: '1250.50', blDate: deliveryDate, paymentMethod: LegacyPaymentMethod.CASH, paymentStatus: LegacyPaymentStatus.PAID, deliveryDate, comments: 'Fake cash delivery' },
      create: { blNumber: 'DEV-BL-1001', clientId: cashClient.id, courierId: courierA.id, createdById: courierA.id, amount: '1250.50', blDate: deliveryDate, paymentMethod: LegacyPaymentMethod.CASH, paymentStatus: LegacyPaymentStatus.PAID, deliveryDate, comments: 'Fake cash delivery' },
    }),
    prisma.bL.upsert({
      where: { blNumber: 'DEV-BL-1002' },
      update: { clientId: chequeClient.id, courierId: courierB.id, createdById: courierB.id, amount: '875.25', blDate: deliveryDate, paymentMethod: LegacyPaymentMethod.CHEQUE, paymentStatus: LegacyPaymentStatus.PAID, deliveryDate, comments: 'Fake cheque delivery' },
      create: { blNumber: 'DEV-BL-1002', clientId: chequeClient.id, courierId: courierB.id, createdById: courierB.id, amount: '875.25', blDate: deliveryDate, paymentMethod: LegacyPaymentMethod.CHEQUE, paymentStatus: LegacyPaymentStatus.PAID, deliveryDate, comments: 'Fake cheque delivery' },
    }),
    prisma.bL.upsert({
      where: { blNumber: 'DEV-BL-1003' },
      update: { clientId: accountClient.id, courierId: courierA.id, createdById: courierA.id, amount: '640.00', blDate: deliveryDate, paymentMethod: LegacyPaymentMethod.ACCOUNT, paymentStatus: LegacyPaymentStatus.PENDING, deliveryDate, comments: 'Fake account delivery' },
      create: { blNumber: 'DEV-BL-1003', clientId: accountClient.id, courierId: courierA.id, createdById: courierA.id, amount: '640.00', blDate: deliveryDate, paymentMethod: LegacyPaymentMethod.ACCOUNT, paymentStatus: LegacyPaymentStatus.PENDING, deliveryDate, comments: 'Fake account delivery' },
    }),
  ]);

  await Promise.all([
    prisma.payment.upsert({
      where: { blId: cashBL.id },
      update: { amount: '1250.50', status: PaymentStatus.PAID, method: PaymentMethod.CASH, paidAt: deliveryDate, isLegacyMigrated: false },
      create: { blId: cashBL.id, createdById: courierA.id, amount: '1250.50', status: PaymentStatus.PAID, method: PaymentMethod.CASH, paidAt: deliveryDate },
    }),
    prisma.payment.upsert({
      where: { blId: chequeBL.id },
      update: { amount: '875.25', status: PaymentStatus.PAID, method: PaymentMethod.CHEQUE, paidAt: deliveryDate, isLegacyMigrated: false },
      create: { blId: chequeBL.id, createdById: courierB.id, amount: '875.25', status: PaymentStatus.PAID, method: PaymentMethod.CHEQUE, paidAt: deliveryDate },
    }),
    prisma.payment.upsert({
      where: { blId: accountBL.id },
      update: { amount: '640.00', status: PaymentStatus.EN_COMPTE, method: null, paidAt: null, isLegacyMigrated: false },
      create: { blId: accountBL.id, createdById: courierA.id, amount: '640.00', status: PaymentStatus.EN_COMPTE },
    }),
  ]);

  void admin;
  console.log('Development seed completed: 3 users, 3 clients, 3 BL records');
};

seed()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Development seed failed');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
