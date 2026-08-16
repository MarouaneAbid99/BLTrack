import jwt from 'jsonwebtoken';
import { AuthPayload } from '@bltrack/shared';
import { env } from '../config/env';

export const createToken = (payload: AuthPayload): string =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: '8h' });

export const verifyToken = (token: string): AuthPayload =>
  jwt.verify(token, env.jwtSecret) as AuthPayload;
