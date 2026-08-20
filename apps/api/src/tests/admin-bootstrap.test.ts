import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { UserRole } from '@bltrack/shared';
import { verifyPassword } from '../utils/password';
import { assertProductionAdminBootstrapCommand } from '../bootstrap-admin';
import {
  AdminBootstrapInput,
  BootstrapDatabase,
  CreatedAdmin,
  createFirstProductionAdmin,
  readAdminBootstrapInput,
} from '../services/admin-bootstrap.service';

interface StoredUser extends CreatedAdmin {
  passwordHash: string;
}

class DedicatedBootstrapTestDatabase implements BootstrapDatabase {
  users: StoredUser[] = [];
  clients: unknown[] = [];
  bls: unknown[] = [];
  payments: unknown[] = [];
  avoirs: unknown[] = [];

  async $transaction<T>(
    action: (transaction: any) => Promise<T>,
  ): Promise<T> {
    const snapshot = structuredClone(this.users);
    try {
      return await action({
        user: {
          findFirst: async () => this.users[0] ? { id: this.users[0].id } : null,
          create: async ({ data }: { data: Omit<StoredUser, 'id'> }) => {
            const user: StoredUser = { id: `test-user-${this.users.length + 1}`, ...data };
            this.users.push(user);
            return {
              id: user.id,
              username: user.username,
              fullName: user.fullName,
              role: user.role,
              isActive: user.isActive,
            };
          },
        },
      });
    } catch (error) {
      this.users = snapshot;
      throw error;
    }
  }
}

const validInput = (): AdminBootstrapInput => ({
  username: 'production-admin',
  fullName: 'Production Administrator',
  password: `${randomBytes(18).toString('base64url')}Aa1!`,
});

const environment = (overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
  BLTRACK_BOOTSTRAP_ADMIN_USERNAME: validInput().username,
  BLTRACK_BOOTSTRAP_ADMIN_FULL_NAME: validInput().fullName,
  BLTRACK_BOOTSTRAP_ADMIN_PASSWORD: validInput().password,
  ...overrides,
});

test('bootstrap input rejects a missing username', () => {
  assert.throws(
    () => readAdminBootstrapInput(environment({ BLTRACK_BOOTSTRAP_ADMIN_USERNAME: undefined })),
    /BLTRACK_BOOTSTRAP_ADMIN_USERNAME is required/,
  );
});

test('bootstrap input rejects a missing full name', () => {
  assert.throws(
    () => readAdminBootstrapInput(environment({ BLTRACK_BOOTSTRAP_ADMIN_FULL_NAME: undefined })),
    /BLTRACK_BOOTSTRAP_ADMIN_FULL_NAME is required/,
  );
});

test('bootstrap input rejects a missing password', () => {
  assert.throws(
    () => readAdminBootstrapInput(environment({ BLTRACK_BOOTSTRAP_ADMIN_PASSWORD: undefined })),
    /BLTRACK_BOOTSTRAP_ADMIN_PASSWORD is required/,
  );
});

test('bootstrap input rejects a weak password', () => {
  assert.throws(
    () => readAdminBootstrapInput(environment({ BLTRACK_BOOTSTRAP_ADMIN_PASSWORD: 'weak-password' })),
    /password must be 12-72 bytes/,
  );
});

test('bootstrap refuses any existing User without modifying it', async () => {
  const database = new DedicatedBootstrapTestDatabase();
  const existing: StoredUser = {
    id: 'existing-user',
    username: 'existing',
    fullName: 'Existing User',
    passwordHash: 'existing-hash',
    role: UserRole.COURIER,
    isActive: false,
  };
  database.users.push(existing);
  const before = structuredClone(database.users);

  await assert.rejects(
    createFirstProductionAdmin(validInput(), database),
    /bootstrap refused: a User already exists/,
  );
  assert.deepEqual(database.users, before);
});

test('bootstrap creates exactly one active ADMIN with a bcrypt hash', async () => {
  const database = new DedicatedBootstrapTestDatabase();
  const input = validInput();
  const created = await createFirstProductionAdmin(input, database);

  assert.equal(database.users.length, 1);
  assert.equal(created.role, UserRole.ADMIN);
  assert.equal(created.isActive, true);
  assert.equal(database.users[0].role, UserRole.ADMIN);
  assert.equal(database.users[0].isActive, true);
  assert.notEqual(database.users[0].passwordHash, input.password);
  assert.equal(database.users[0].passwordHash.startsWith('$2'), true);
  assert.equal(await verifyPassword(input.password, database.users[0].passwordHash), true);
});

test('second execution is rejected and no other business records are created', async () => {
  const database = new DedicatedBootstrapTestDatabase();
  await createFirstProductionAdmin(validInput(), database);

  await assert.rejects(
    createFirstProductionAdmin({ ...validInput(), username: 'second-admin' }, database),
    /bootstrap refused: a User already exists/,
  );
  assert.equal(database.users.length, 1);
  assert.equal(database.clients.length, 0);
  assert.equal(database.bls.length, 0);
  assert.equal(database.payments.length, 0);
  assert.equal(database.avoirs.length, 0);
});

test('production bootstrap can only run through the explicit npm lifecycle command', () => {
  assert.throws(
    () => assertProductionAdminBootstrapCommand({ NODE_ENV: 'production' }),
    /must be run explicitly/,
  );
  assert.throws(
    () => assertProductionAdminBootstrapCommand({ NODE_ENV: 'development', npm_lifecycle_event: 'bootstrap:admin' }),
    /requires NODE_ENV=production/,
  );
  assert.doesNotThrow(
    () => assertProductionAdminBootstrapCommand({ NODE_ENV: 'production', npm_lifecycle_event: 'bootstrap:admin' }),
  );
});
