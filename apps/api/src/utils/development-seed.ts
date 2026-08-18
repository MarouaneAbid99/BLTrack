import { createHmac } from 'crypto';

export const developmentSeedPassword = (identity: string): string => {
  if (identity === 'dev-courier-a') {
    const password = process.env.DEV_COURIER_A_PASSWORD;
    if (!password) throw new Error('DEV_COURIER_A_PASSWORD must be configured for development seed credentials');
    return password;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET must be configured for development seed credentials');
  return createHmac('sha256', secret).update(`bltrack-development-seed:${identity}`).digest('base64url');
};
