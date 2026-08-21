import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertDatabaseTestAllowed,
  assertDedicatedTestDatabase,
  assertDevelopmentSeedAllowed,
  assertPersistenceCheckAllowed,
  DEDICATED_TEST_DATABASE_OVERRIDE,
} from '../utils/database-safety';
import { sanitizeStartupError } from '../utils/startup-error';
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

test('dedicated database tests require an explicitly test-marked database name', () => {
  withEnvironment({
    NODE_ENV: 'production',
    [DEDICATED_TEST_DATABASE_OVERRIDE]: 'true',
    DATABASE_URL: 'mysql://example.invalid/defaultdb',
  }, () => {
    assert.throws(assertDedicatedTestDatabase, /database name must be explicitly marked as test/);
  });
  withEnvironment({
    NODE_ENV: 'production',
    [DEDICATED_TEST_DATABASE_OVERRIDE]: 'true',
    DATABASE_URL: 'mysql://example.invalid/bltrack_bootstrap_test',
  }, () => {
    assert.doesNotThrow(assertDedicatedTestDatabase);
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

test('startup diagnostics redact configured secrets and connection URLs', () => {
  const databaseUrl = 'mysql://user:private-password@example.invalid:3306/defaultdb?ssl=true';
  const bootstrapPassword = 'Temporary-Admin-Password-123!';
  const jwtSecret = 'private-jwt-secret';
  const error = new Error(
    `Failed with DATABASE_URL=${databaseUrl}, password=${bootstrapPassword}, JWT_SECRET=${jwtSecret}`,
  );
  error.name = `DatabaseConnectionError-${bootstrapPassword}`;
  error.stack = `DatabaseConnectionError: ${databaseUrl}\n    password: ${bootstrapPassword}`;

  const diagnostic = sanitizeStartupError(error, {
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    BLTRACK_BOOTSTRAP_ADMIN_PASSWORD: bootstrapPassword,
  });
  const output = JSON.stringify(diagnostic);

  assert.equal(output.includes(databaseUrl), false);
  assert.equal(output.includes(bootstrapPassword), false);
  assert.equal(output.includes(jwtSecret), false);
  assert.match(output, /\[REDACTED\]/);

  const unknownConnectionUrl = 'mariadb://other-user:other-password@example.invalid/defaultdb';
  const patternDiagnostic = sanitizeStartupError(
    new Error(`Adapter rejected ${unknownConnectionUrl}`),
    {},
  );
  assert.equal(JSON.stringify(patternDiagnostic).includes(unknownConnectionUrl), false);
  assert.match(patternDiagnostic.message, /\[REDACTED_CONNECTION_URL\]/);
});

test('startup diagnostics preserve safe error fields and stack traces', () => {
  const error = new TypeError('Startup administrator bootstrap refused: deployed commit is not explicitly approved');
  const diagnostic = sanitizeStartupError(error, {});

  assert.equal(diagnostic.name, 'TypeError');
  assert.equal(diagnostic.message, error.message);
  assert.equal(typeof diagnostic.stack, 'string');
  assert.match(diagnostic.stack!, /TypeError/);
});

test('startup diagnostics safely handle non-Error thrown values', () => {
  assert.deepEqual(sanitizeStartupError('startup failed', {}), {
    name: 'NonErrorThrown',
    message: 'startup failed',
  });
});
