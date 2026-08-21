import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { UserRole } from '@bltrack/shared';
import { CreatedAdmin } from '../services/admin-bootstrap.service';
import {
  RENDER_STARTUP_ADMIN_BOOTSTRAP_ACTIVATION,
  RENDER_STARTUP_ADMIN_BOOTSTRAP_ENV,
  StartupAdminBootstrapDatabase,
  runRenderStartupAdminBootstrap,
} from '../services/startup-admin-bootstrap.service';
import { verifyPassword } from '../utils/password';

interface StoredUser extends CreatedAdmin {
  passwordHash: string;
}

class StartupBootstrapTestDatabase implements StartupAdminBootstrapDatabase {
  users: StoredUser[] = [];
  clients: unknown[] = [];
  bls: unknown[] = [];
  payments: unknown[] = [];
  avoirs: unknown[] = [];
  findCalls = 0;

  user = {
    findFirst: async (): Promise<{ id: string } | null> => {
      this.findCalls += 1;
      return this.users[0] ? { id: this.users[0].id } : null;
    },
  };

  async $transaction<T>(action: (transaction: any) => Promise<T>): Promise<T> {
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

const approvedCommit = 'a'.repeat(40);

const activeEnvironment = (overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production',
  RENDER: 'true',
  RENDER_GIT_REPO_SLUG: 'MarouaneAbid99/BLTrack',
  RENDER_GIT_BRANCH: 'phase1',
  RENDER_GIT_COMMIT: approvedCommit,
  BLTRACK_BOOTSTRAP_ADMIN_ON_START: RENDER_STARTUP_ADMIN_BOOTSTRAP_ACTIVATION,
  BLTRACK_BOOTSTRAP_ADMIN_APPROVED_COMMIT: approvedCommit,
  BLTRACK_BOOTSTRAP_ADMIN_USERNAME: 'production-admin',
  BLTRACK_BOOTSTRAP_ADMIN_FULL_NAME: 'Production Administrator',
  BLTRACK_BOOTSTRAP_ADMIN_PASSWORD: `${randomBytes(18).toString('base64url')}Aa1!`,
  ...overrides,
});

const assertTemporaryEnvironmentCleared = (environment: NodeJS.ProcessEnv): void => {
  for (const name of [
    'BLTRACK_BOOTSTRAP_ADMIN_ON_START',
    'BLTRACK_BOOTSTRAP_ADMIN_APPROVED_COMMIT',
    'BLTRACK_BOOTSTRAP_ADMIN_USERNAME',
    'BLTRACK_BOOTSTRAP_ADMIN_FULL_NAME',
    'BLTRACK_BOOTSTRAP_ADMIN_PASSWORD',
  ]) {
    assert.equal(environment[name], undefined, `${name} must be removed from the running process`);
  }
};

test('startup bootstrap is disabled unless the exact activation value is present', async () => {
  const database = new StartupBootstrapTestDatabase();
  const environment = activeEnvironment({ BLTRACK_BOOTSTRAP_ADMIN_ON_START: undefined });

  assert.equal(await runRenderStartupAdminBootstrap(environment, database), 'disabled');
  assert.equal(database.findCalls, 0);
  assert.equal(database.users.length, 0);
  assertTemporaryEnvironmentCleared(environment);
});

test('startup bootstrap refuses a non-Render runtime and clears temporary values', async () => {
  const database = new StartupBootstrapTestDatabase();
  const environment = activeEnvironment({ RENDER: undefined });

  await assert.rejects(
    runRenderStartupAdminBootstrap(environment, database),
    /restricted to Render/,
  );
  assert.equal(database.users.length, 0);
  assertTemporaryEnvironmentCleared(environment);
});

test('startup bootstrap refuses an unapproved deployment revision', async () => {
  const database = new StartupBootstrapTestDatabase();
  const environment = activeEnvironment({ BLTRACK_BOOTSTRAP_ADMIN_APPROVED_COMMIT: 'b'.repeat(40) });

  await assert.rejects(
    runRenderStartupAdminBootstrap(environment, database),
    /deployed commit is not explicitly approved/,
  );
  assert.equal(database.users.length, 0);
  assertTemporaryEnvironmentCleared(environment);
});

test('startup bootstrap creates exactly one active ADMIN and no business records', async () => {
  const database = new StartupBootstrapTestDatabase();
  const environment = activeEnvironment();
  const password = environment.BLTRACK_BOOTSTRAP_ADMIN_PASSWORD!;

  assert.equal(await runRenderStartupAdminBootstrap(environment, database), 'created');
  assert.equal(database.users.length, 1);
  assert.equal(database.users[0].role, UserRole.ADMIN);
  assert.equal(database.users[0].isActive, true);
  assert.notEqual(database.users[0].passwordHash, password);
  assert.equal(await verifyPassword(password, database.users[0].passwordHash), true);
  assert.equal(database.clients.length, 0);
  assert.equal(database.bls.length, 0);
  assert.equal(database.payments.length, 0);
  assert.equal(database.avoirs.length, 0);
  assertTemporaryEnvironmentCleared(environment);
});

test('startup bootstrap is permanently inactive while any User exists', async () => {
  const database = new StartupBootstrapTestDatabase();
  const firstEnvironment = activeEnvironment();
  assert.equal(await runRenderStartupAdminBootstrap(firstEnvironment, database), 'created');
  const storedBefore = structuredClone(database.users);

  const secondEnvironment = activeEnvironment({
    RENDER_GIT_COMMIT: 'c'.repeat(40),
    BLTRACK_BOOTSTRAP_ADMIN_APPROVED_COMMIT: undefined,
    BLTRACK_BOOTSTRAP_ADMIN_USERNAME: undefined,
    BLTRACK_BOOTSTRAP_ADMIN_FULL_NAME: undefined,
    BLTRACK_BOOTSTRAP_ADMIN_PASSWORD: undefined,
  });
  assert.equal(await runRenderStartupAdminBootstrap(secondEnvironment, database), 'already-initialized');
  assert.deepEqual(database.users, storedBefore);
  assert.equal(database.users.length, 1);
  assertTemporaryEnvironmentCleared(secondEnvironment);
});

test('startup bootstrap rejects invalid credentials without creating data', async () => {
  const database = new StartupBootstrapTestDatabase();
  const environment = activeEnvironment({ BLTRACK_BOOTSTRAP_ADMIN_PASSWORD: 'weak-password' });

  await assert.rejects(
    runRenderStartupAdminBootstrap(environment, database),
    /password must be 12-72 bytes/,
  );
  assert.equal(database.users.length, 0);
  assert.equal(database.clients.length, 0);
  assert.equal(database.bls.length, 0);
  assert.equal(database.payments.length, 0);
  assert.equal(database.avoirs.length, 0);
  assertTemporaryEnvironmentCleared(environment);
});
