import { AppError } from '../../utils/app-error.js';
import { signToken } from '../../utils/jwt.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { usersRepository } from '../users/users.repository.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

export async function register({ name, email, password }: RegisterInput) {
  if (await usersRepository.findByEmail(email)) {
    throw new AppError(409, 'EMAIL_IN_USE', 'Email is already registered');
  }
  const { tokenVersion, ...user } = await usersRepository.create({
    name,
    email,
    passwordHash: await hashPassword(password),
  });
  return { user, token: signToken({ userId: user.id, tokenVersion }) };
}

export async function login({ email, password }: LoginInput) {
  const found = await usersRepository.findByEmailWithCredentials(email);
  // Always run bcrypt so response time does not reveal whether the email exists.
  const passwordMatches = await verifyPassword(password, found?.passwordHash);
  if (!found || !passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  const { passwordHash: _hash, tokenVersion, ...user } = found;
  return { user, token: signToken({ userId: user.id, tokenVersion }) };
}
