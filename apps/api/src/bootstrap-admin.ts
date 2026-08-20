import { createFirstProductionAdmin, readAdminBootstrapInput } from './services/admin-bootstrap.service';
import { prisma } from './utils/prisma';

const BOOTSTRAP_SCRIPT = 'bootstrap:admin';

export const assertProductionAdminBootstrapCommand = (
  environment: NodeJS.ProcessEnv = process.env,
): void => {
  if (environment.NODE_ENV?.trim().toLowerCase() !== 'production') {
    throw new Error('Production administrator bootstrap requires NODE_ENV=production');
  }
  if (environment.npm_lifecycle_event !== BOOTSTRAP_SCRIPT) {
    throw new Error(`Production administrator bootstrap must be run explicitly with npm run ${BOOTSTRAP_SCRIPT}`);
  }
};

const run = async (): Promise<void> => {
  assertProductionAdminBootstrapCommand();
  await createFirstProductionAdmin(readAdminBootstrapInput());
  console.log('Production administrator created successfully');
};

if (require.main === module) {
  run()
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : 'Production administrator bootstrap failed');
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
