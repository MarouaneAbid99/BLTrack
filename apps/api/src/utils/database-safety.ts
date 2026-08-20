const PRODUCTION = 'production';
export const DEDICATED_TEST_DATABASE_OVERRIDE = 'BLTRACK_DEDICATED_TEST_DATABASE';

const isProduction = (): boolean => process.env.NODE_ENV?.trim().toLowerCase() === PRODUCTION;

export const assertDevelopmentSeedAllowed = (): void => {
  if (isProduction()) {
    throw new Error('Development seed refused: NODE_ENV=production');
  }
};

const assertProductionTestOverride = (operation: string): void => {
  if (!isProduction()) return;
  if (process.env[DEDICATED_TEST_DATABASE_OVERRIDE] === 'true') return;
  throw new Error(
    `${operation} refused: NODE_ENV=production. `
      + `Use a dedicated test database and set ${DEDICATED_TEST_DATABASE_OVERRIDE}=true only for that database.`,
  );
};

export const assertPersistenceCheckAllowed = (): void =>
  assertProductionTestOverride('Persistence check');

export const assertDatabaseTestAllowed = (): void =>
  assertProductionTestOverride('Database-backed test');

export const assertDedicatedTestDatabase = (): void => {
  assertDatabaseTestAllowed();
  if (process.env[DEDICATED_TEST_DATABASE_OVERRIDE] !== 'true') {
    throw new Error(`Dedicated database test refused: ${DEDICATED_TEST_DATABASE_OVERRIDE}=true is required`);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Dedicated database test refused: DATABASE_URL is required');

  let databaseName: string;
  try {
    databaseName = new URL(databaseUrl).pathname.slice(1);
  } catch {
    throw new Error('Dedicated database test refused: DATABASE_URL is invalid');
  }
  if (!/(^|[_-])test($|[_-])/i.test(databaseName)) {
    throw new Error('Dedicated database test refused: database name must be explicitly marked as test');
  }
};
