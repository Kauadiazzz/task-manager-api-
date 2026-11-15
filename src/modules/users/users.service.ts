import { AppError } from '../../utils/app-error.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { usersRepository } from './users.repository.js';
import type { ChangePasswordInput, UpdateProfileInput } from './users.schemas.js';

const userNotFound = () => new AppError(404, 'USER_NOT_FOUND', 'User not found');

export async function getProfile(userId: string) {
  const user = await usersRepository.findById(userId);
  if (!user) throw userNotFound();
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  if (input.email) {
    const owner = await usersRepository.findByEmail(input.email);
    if (owner && owner.id !== userId) throw new AppError(409, 'EMAIL_IN_USE', 'Email is already registered');
  }
  return usersRepository.update(userId, input);
}

export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await usersRepository.findByIdWithCredentials(userId);
  if (!user) throw userNotFound();
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
  }
  await usersRepository.updatePassword(userId, await hashPassword(input.newPassword));
}
