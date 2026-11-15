import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface TokenPayload {
  userId: string;
  tokenVersion: number;
}

export function signToken({ userId, tokenVersion }: TokenPayload): string {
  return jwt.sign({ ver: tokenVersion }, env.JWT_SECRET, {
    subject: userId,
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'], // format validated in env.ts
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.sub !== 'string' || typeof payload.ver !== 'number') {
      return null;
    }
    return { userId: payload.sub, tokenVersion: payload.ver };
  } catch {
    return null;
  }
}
