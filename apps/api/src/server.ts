import { app } from './app';
import { env } from './config/env';

env.validateProduction();
app.listen(env.port, env.host, () => {
  console.log(`BLTrack API listening on ${env.host}:${env.port}`);
});
