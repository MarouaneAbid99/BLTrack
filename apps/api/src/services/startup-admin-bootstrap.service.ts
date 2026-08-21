import {
  ADMIN_BOOTSTRAP_ENV,
  BootstrapDatabase,
  createFirstProductionAdmin,
  readAdminBootstrapInput,
} from './admin-bootstrap.service';
import { prisma } from '../utils/prisma';

export const RENDER_STARTUP_ADMIN_BOOTSTRAP_ENV = {
  activation: 'BLTRACK_BOOTSTRAP_ADMIN_ON_START',
  approvedCommit: 'BLTRACK_BOOTSTRAP_ADMIN_APPROVED_COMMIT',
} as const;

export const RENDER_STARTUP_ADMIN_BOOTSTRAP_ACTIVATION = 'CREATE_FIRST_ADMIN_ONCE';

const EXPECTED_RENDER_REPOSITORY = 'marouaneabid99/bltrack';
const EXPECTED_RENDER_BRANCH = 'phase1';

export type StartupAdminBootstrapStatus = 'disabled' | 'created' | 'already-initialized';

export interface StartupAdminBootstrapDatabase extends BootstrapDatabase {
  user: {
    findFirst(args: { select: { id: true } }): Promise<{ id: string } | null>;
  };
}

const temporaryEnvironmentNames = [
  ...Object.values(ADMIN_BOOTSTRAP_ENV),
  ...Object.values(RENDER_STARTUP_ADMIN_BOOTSTRAP_ENV),
];

const clearTemporaryEnvironment = (environment: NodeJS.ProcessEnv): void => {
  for (const name of temporaryEnvironmentNames) delete environment[name];
};

const assertRenderProductionRuntime = (environment: NodeJS.ProcessEnv): void => {
  if (environment.NODE_ENV?.trim().toLowerCase() !== 'production') {
    throw new Error('Startup administrator bootstrap requires NODE_ENV=production');
  }
  if (environment.RENDER !== 'true') {
    throw new Error('Startup administrator bootstrap is restricted to Render');
  }
};

const assertApprovedRenderRevision = (environment: NodeJS.ProcessEnv): void => {
  if (environment.RENDER_GIT_REPO_SLUG?.trim().toLowerCase() !== EXPECTED_RENDER_REPOSITORY) {
    throw new Error('Startup administrator bootstrap refused: unexpected Render repository');
  }
  if (environment.RENDER_GIT_BRANCH?.trim() !== EXPECTED_RENDER_BRANCH) {
    throw new Error('Startup administrator bootstrap refused: unexpected Render branch');
  }

  const deployedCommit = environment.RENDER_GIT_COMMIT?.trim().toLowerCase();
  const approvedCommit = environment[RENDER_STARTUP_ADMIN_BOOTSTRAP_ENV.approvedCommit]?.trim().toLowerCase();
  if (!deployedCommit || !/^[0-9a-f]{40}$/.test(deployedCommit)) {
    throw new Error('Startup administrator bootstrap refused: Render commit is unavailable');
  }
  if (!approvedCommit || approvedCommit !== deployedCommit) {
    throw new Error('Startup administrator bootstrap refused: deployed commit is not explicitly approved');
  }
};

const anyUserExists = async (database: StartupAdminBootstrapDatabase): Promise<boolean> =>
  Boolean(await database.user.findFirst({ select: { id: true } }));

export const runRenderStartupAdminBootstrap = async (
  environment: NodeJS.ProcessEnv = process.env,
  database: StartupAdminBootstrapDatabase = prisma as unknown as StartupAdminBootstrapDatabase,
): Promise<StartupAdminBootstrapStatus> => {
  const activation = environment[RENDER_STARTUP_ADMIN_BOOTSTRAP_ENV.activation];
  if (!activation) {
    clearTemporaryEnvironment(environment);
    return 'disabled';
  }

  try {
    if (activation !== RENDER_STARTUP_ADMIN_BOOTSTRAP_ACTIVATION) {
      throw new Error('Startup administrator bootstrap activation value is invalid');
    }
    assertRenderProductionRuntime(environment);

    // User existence is the permanent one-time gate. Check it before credentials
    // or revision metadata so stale temporary variables cannot disrupt later starts.
    if (await anyUserExists(database)) return 'already-initialized';

    assertApprovedRenderRevision(environment);
    const input = readAdminBootstrapInput(environment);

    try {
      await createFirstProductionAdmin(input, database);
      return 'created';
    } catch (error) {
      // A concurrent Render instance may win the serializable transaction. If a
      // User now exists, the one-time objective is satisfied and remains closed.
      if (await anyUserExists(database)) return 'already-initialized';
      throw error;
    }
  } finally {
    clearTemporaryEnvironment(environment);
  }
};
