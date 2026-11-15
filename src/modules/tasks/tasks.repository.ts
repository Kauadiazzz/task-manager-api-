import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from './tasks.schemas.js';

// Tasks have no owner column; every query reaches the owner through project.ownerId.
export const tasksRepository = {
  create(projectId: string, data: CreateTaskInput) {
    return prisma.task.create({ data: { ...data, projectId } });
  },

  findManyByOwner(ownerId: string, query: ListTasksQuery) {
    const { projectId, status, priority, search, sortBy, order, limit, offset } = query;
    const where: Prisma.TaskWhereInput = {
      project: { ownerId },
      projectId,
      status,
      priority,
      // Prisma passes LIKE wildcards through, so escape them to search the literal text.
      title: search ? { contains: search.replace(/[\\%_]/g, '\\$&'), mode: 'insensitive' } : undefined,
    };
    const orderBy: Prisma.TaskOrderByWithRelationInput[] =
      sortBy === 'dueDate'
        ? [{ dueDate: { sort: order, nulls: 'last' } }, { id: 'asc' }]
        : [{ createdAt: order }, { id: 'asc' }];

    return prisma.$transaction([
      prisma.task.findMany({ where, orderBy, take: limit, skip: offset }),
      prisma.task.count({ where }),
    ]);
  },

  findOwned(id: string, ownerId: string) {
    return prisma.task.findFirst({ where: { id, project: { ownerId } } });
  },

  updateOwned(id: string, ownerId: string, data: UpdateTaskInput) {
    return prisma.task.update({ where: { id, project: { ownerId } }, data });
  },

  async deleteOwned(id: string, ownerId: string): Promise<boolean> {
    const { count } = await prisma.task.deleteMany({ where: { id, project: { ownerId } } });
    return count > 0;
  },
};
