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
