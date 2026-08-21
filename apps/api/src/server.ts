import { app } from './app';
import { env } from './config/env';
import { runRenderStartupAdminBootstrap } from './services/startup-admin-bootstrap.service';
import {
  diagnoseDatabaseConnection,
  safeDatabaseConnectionConfiguration,
} from './utils/database-connection-diagnostic';
import { prisma } from './utils/prisma';
import { sanitizeStartupError } from './utils/startup-error';

const logSanitizedError = (label: string, error: unknown): void => {
  const diagnostic = sanitizeStartupError(error);
  console.error(`${label} name: ${diagnostic.name}`);
  console.error(`${label} message: ${diagnostic.message}`);
  if (diagnostic.stack) console.error(`${label} stack:\n${diagnostic.stack}`);
};

const startServer = async (): Promise<void> => {
  env.validateProduction();
  const bootstrapStatus = await runRenderStartupAdminBootstrap();
  if (bootstrapStatus === 'disabled') {
    console.log('Production administrator startup bootstrap disabled');
  } else if (bootstrapStatus === 'created') {
    console.log('Production administrator bootstrap completed; startup mechanism is now inactive');
  } else if (bootstrapStatus === 'already-initialized') {
    console.log('Production administrator bootstrap inactive: a User already exists');
  }

  app.listen(env.port, env.host, () => {
    console.log(`BLTrack API listening on ${env.host}:${env.port}`);
  });
};

void startServer().catch(async (error: unknown) => {
  console.error('BLTrack API startup failed before listening');
  logSanitizedError('Startup error', error);
  console.error(`Database configuration diagnostic: ${JSON.stringify(safeDatabaseConnectionConfiguration())}`);
  console.error(`Database connection diagnostic: ${JSON.stringify(await diagnoseDatabaseConnection())}`);
  try {
    await prisma.$disconnect();
  } catch (disconnectError) {
    console.error('Prisma disconnect after startup failure also failed');
    logSanitizedError('Startup cleanup error', disconnectError);
  }
  process.exitCode = 1;
});
