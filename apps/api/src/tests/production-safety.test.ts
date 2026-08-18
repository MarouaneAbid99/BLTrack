import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertDatabaseTestAllowed,
  assertDevelopmentSeedAllowed,
  assertPersistenceCheckAllowed,
  DEDICATED_TEST_DATABASE_OVERRIDE,
} from '../utils/database-safety';
import { mariaDbAdapterUrl } from '../utils/database-url';
import { env } from '../config/env';

const withEnvironment = (values: Record<string, string | undefined>, action: () => void): void => {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    action();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

test('production refuses seed, persistence checks, and database tests by default', () => {
  withEnvironment({ NODE_ENV: 'production', [DEDICATED_TEST_DATABASE_OVERRIDE]: undefined }, () => {
    assert.throws(assertDevelopmentSeedAllowed, /Development seed refused/);
    assert.throws(assertPersistenceCheckAllowed, /Persistence check refused/);
    assert.throws(assertDatabaseTestAllowed, /Database-backed test refused/);
  });
});

test('dedicated test override applies to checks and tests but never to seed', () => {
  withEnvironment({ NODE_ENV: 'production', [DEDICATED_TEST_DATABASE_OVERRIDE]: 'true' }, () => {
    assert.doesNotThrow(assertPersistenceCheckAllowed);
    assert.doesNotThrow(assertDatabaseTestAllowed);
    assert.throws(assertDevelopmentSeedAllowed, /Development seed refused/);
  });
});

test('normal non-production environment remains allowed', () => {
  withEnvironment({ NODE_ENV: 'test', [DEDICATED_TEST_DATABASE_OVERRIDE]: undefined }, () => {
    assert.doesNotThrow(assertDevelopmentSeedAllowed);
    assert.doesNotThrow(assertPersistenceCheckAllowed);
    assert.doesNotThrow(assertDatabaseTestAllowed);
  });
});

test('production environment requires database URL and JWT secret', () => {
  withEnvironment({ NODE_ENV: 'production', DATABASE_URL: undefined, JWT_SECRET: undefined }, () => {
    assert.throws(() => env.validateProduction(), /DATABASE_URL must be configured/);
  });
  withEnvironment({ NODE_ENV: 'production', DATABASE_URL: 'mysql://example.invalid/bltrack', JWT_SECRET: undefined }, () => {
    assert.throws(() => env.validateProduction(), /JWT_SECRET must be configured/);
  });
  withEnvironment({ NODE_ENV: 'production', DATABASE_URL: 'mysql://example.invalid/bltrack', JWT_SECRET: 'test-only' }, () => {
    assert.doesNotThrow(() => env.validateProduction());
  });
});

test('database adapter URL preserves credentials, path, and TLS query parameters', () => {
  const source = 'mysql://user:password@example.invalid:3307/bltrack?ssl=true&connectTimeout=9000';
  assert.equal(
    mariaDbAdapterUrl(source),
    'mariadb://user:password@example.invalid:3307/bltrack?ssl=true&connectTimeout=9000',
  );
  assert.equal(
    mariaDbAdapterUrl('mariadb://user:password@example.invalid/bltrack?ssl=true'),
    'mariadb://user:password@example.invalid/bltrack?ssl=true',
  );
  assert.throws(() => mariaDbAdapterUrl('postgresql://example.invalid/bltrack'), /mysql: or mariadb:/);
});
