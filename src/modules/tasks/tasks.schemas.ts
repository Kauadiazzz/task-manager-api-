import { z } from 'zod';
import { Priority, Status } from '../../generated/prisma/client.js';
import { paginationSchema } from '../../utils/schemas.js';

const titleField = z.string().trim().min(1).max(200);
const descriptionField = z.string().trim().max(5000).nullable();
const dueDateField = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .nullable();

export const createTaskSchema = z.object({
  title: titleField,
  description: descriptionField.optional(),
  priority: z.enum(Priority).optional(),
  status: z.enum(Status).optional(),
  dueDate: dueDateField.optional(),
});

export const updateTaskSchema = createTaskSchema
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Provide at least one field to update',
  });

export const listTasksQuerySchema = paginationSchema.extend({
  projectId: z.uuid().optional(),
  status: z.enum(Status).optional(),
  priority: z.enum(Priority).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  sortBy: z.enum(['createdAt', 'dueDate']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
