import { z } from 'zod';

const nameField = z.string().trim().min(1).max(100);
const descriptionField = z.string().trim().max(1000).nullable();

export const createProjectSchema = z.object({
  name: nameField,
  description: descriptionField.optional(),
});

export const updateProjectSchema = z
  .object({ name: nameField.optional(), description: descriptionField.optional() })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Provide at least one field to update',
  });

export const projectIdParamSchema = z.object({ projectId: z.uuid() });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
