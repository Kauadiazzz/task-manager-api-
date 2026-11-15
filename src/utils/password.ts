import bcrypt from 'bcrypt';
import { env } from '../config/env.js';

// Compared against when the email does not exist, so login takes the same time either way.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', env.BCRYPT_ROUNDS);

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string | undefined): Promise<boolean> {
  return bcrypt.compare(password, hash ?? DUMMY_HASH);
}
