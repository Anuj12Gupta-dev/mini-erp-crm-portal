import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

export interface AuthTokenPayload {
  userId: string;
  role: Role;
}

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set');
}
const secret: string = process.env.JWT_SECRET;

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, secret) as AuthTokenPayload;
}
