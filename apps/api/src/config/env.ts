const required = (name: 'DATABASE_URL' | 'JWT_SECRET'): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be configured`);
  }
  return value;
};

export const env = {
  get jwtSecret(): string {
    return required('JWT_SECRET');
  },
  get port(): number {
    const value = Number(process.env.PORT ?? 3001);
    return Number.isInteger(value) && value > 0 ? value : 3001;
  },
  get host(): string {
    return process.env.HOST?.trim() || '0.0.0.0';
  },
  get nodeEnv(): string {
    return process.env.NODE_ENV?.trim() || 'development';
  },
  get corsOrigins(): string[] {
    return (process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
  },
  validateProduction(): void {
    if (this.nodeEnv !== 'production') return;
    required('DATABASE_URL');
    required('JWT_SECRET');
  },
};
