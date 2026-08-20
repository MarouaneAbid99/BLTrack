import bcrypt from 'bcryptjs';

export const PASSWORD_HASH_ROUNDS = 12;

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

export const verifyPassword = (password: string, passwordHash: string): Promise<boolean> =>
  bcrypt.compare(password, passwordHash);
