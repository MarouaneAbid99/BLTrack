import bcrypt from 'bcryptjs';
import { UserRole, validateLoginRequest } from '@bltrack/shared';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../utils/prisma';
import { createToken } from '../utils/jwt';

export const login = async (input: unknown) => {
  const validation = validateLoginRequest(input);
  if (!validation.isValid) {
    throw new AppError(400, 'VALIDATION_ERROR', Object.values(validation.errors).join(' '));
  }

  const { username, password } = input as { username: string; password: string };
  const user = await prisma.user.findUnique({ where: { username: username.trim() } });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid username or password');
  }

  const safeUser = { id: user.id, username: user.username, fullName: user.fullName, role: user.role };
  return { user: safeUser, token: createToken({ id: user.id, username: user.username, role: user.role as UserRole }) };
};
