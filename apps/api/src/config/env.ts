const required = (name: 'JWT_SECRET'): string => {
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
};
