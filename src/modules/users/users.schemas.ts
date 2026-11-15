import { z } from 'zod';

export const nameField = z.string().trim().min(1).max(100);
export const emailField = z.string().trim().toLowerCase().pipe(z.email());
// bcrypt only uses the first 72 bytes of a password.
export const passwordField = z.string().min(8).max(72);

export const updateProfileSchema = z
  .object({ name: nameField.optional(), email: emailField.optional() })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: 'Provide at least one field to update',
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordField,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
