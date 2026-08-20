import { Prisma } from '@prisma/client';
import { UserRole } from '@bltrack/shared';
import { hashPassword } from '../utils/password';
import { prisma } from '../utils/prisma';

export const ADMIN_BOOTSTRAP_ENV = {
  username: 'BLTRACK_BOOTSTRAP_ADMIN_USERNAME',
  fullName: 'BLTRACK_BOOTSTRAP_ADMIN_FULL_NAME',
  password: 'BLTRACK_BOOTSTRAP_ADMIN_PASSWORD',
} as const;

export interface AdminBootstrapInput {
  username: string;
  fullName: string;
  password: string;
}

export interface CreatedAdmin {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

interface BootstrapTransaction {
  user: {
    findFirst(args: { select: { id: true } }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        username: string;
        fullName: string;
        passwordHash: string;
        role: UserRole;
        isActive: boolean;
      };
      select: {
        id: true;
        username: true;
        fullName: true;
        role: true;
        isActive: true;
      };
    }): Promise<CreatedAdmin>;
  };
}

export interface BootstrapDatabase {
  $transaction<T>(
    action: (transaction: BootstrapTransaction) => Promise<T>,
    options: { isolationLevel: Prisma.TransactionIsolationLevel },
  ): Promise<T>;
}

const requiredEnvironmentValue = (
  environment: NodeJS.ProcessEnv,
  name: typeof ADMIN_BOOTSTRAP_ENV[keyof typeof ADMIN_BOOTSTRAP_ENV],
): string => {
  const value = environment[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
};

export const validateAdminBootstrapInput = (input: AdminBootstrapInput): AdminBootstrapInput => {
  const username = input.username.trim();
  const fullName = input.fullName.trim();
  const password = input.password;

  if (username.length < 3 || username.length > 64 || !/^[A-Za-z0-9._-]+$/.test(username)) {
    throw new Error('Bootstrap administrator username must be 3-64 characters using letters, numbers, dot, underscore, or hyphen');
  }
  if (fullName.length < 2 || fullName.length > 100 || /[\u0000-\u001F\u007F]/.test(fullName)) {
    throw new Error('Bootstrap administrator full name must be 2-100 characters without control characters');
  }
  if (
    password.length < 12
    || Buffer.byteLength(password, 'utf8') > 72
    || !/[a-z]/.test(password)
    || !/[A-Z]/.test(password)
    || !/[0-9]/.test(password)
    || !/[^A-Za-z0-9]/.test(password)
    || password.toLowerCase().includes(username.toLowerCase())
  ) {
    throw new Error(
      'Bootstrap administrator password must be 12-72 bytes and include upper-case, lower-case, numeric, and special characters without containing the username',
    );
  }

  return { username, fullName, password };
};

export const readAdminBootstrapInput = (
  environment: NodeJS.ProcessEnv = process.env,
): AdminBootstrapInput => validateAdminBootstrapInput({
  username: requiredEnvironmentValue(environment, ADMIN_BOOTSTRAP_ENV.username),
  fullName: requiredEnvironmentValue(environment, ADMIN_BOOTSTRAP_ENV.fullName),
  password: requiredEnvironmentValue(environment, ADMIN_BOOTSTRAP_ENV.password),
});

export const createFirstProductionAdmin = async (
  input: AdminBootstrapInput,
  database: BootstrapDatabase = prisma as unknown as BootstrapDatabase,
): Promise<CreatedAdmin> => {
  const validated = validateAdminBootstrapInput(input);

  return database.$transaction(async (transaction) => {
    const existingUser = await transaction.user.findFirst({ select: { id: true } });
    if (existingUser) {
      throw new Error('Production administrator bootstrap refused: a User already exists');
    }

    const passwordHash = await hashPassword(validated.password);
    return transaction.user.create({
      data: {
        username: validated.username,
        fullName: validated.fullName,
        passwordHash,
        role: UserRole.ADMIN,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
};
