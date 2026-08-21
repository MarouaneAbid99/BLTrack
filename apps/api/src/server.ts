import { app } from './app';
import { env } from './config/env';
import { runRenderStartupAdminBootstrap } from './services/startup-admin-bootstrap.service';
import { prisma } from './utils/prisma';

const startServer = async (): Promise<void> => {
  env.validateProduction();
  const bootstrapStatus = await runRenderStartupAdminBootstrap();
  if (bootstrapStatus === 'created') {
    console.log('Production administrator bootstrap completed; startup mechanism is now inactive');
  } else if (bootstrapStatus === 'already-initialized') {
    console.log('Production administrator bootstrap inactive: a User already exists');
  }

  app.listen(env.port, env.host, () => {
    console.log(`BLTrack API listening on ${env.host}:${env.port}`);
  });
};

void startServer().catch(async () => {
  console.error('BLTrack API startup failed before listening');
  await prisma.$disconnect();
  process.exitCode = 1;
});
