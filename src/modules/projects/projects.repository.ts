import { prisma } from '../../lib/prisma.js';
import type { Pagination } from '../../utils/schemas.js';
import type { CreateProjectInput, UpdateProjectInput } from './projects.schemas.js';

// Every query is scoped by ownerId, so a project id alone never grants access.
export const projectsRepository = {
  create(ownerId: string, data: CreateProjectInput) {
    return prisma.project.create({ data: { ...data, ownerId } });
  },

  findManyByOwner(ownerId: string, { limit, offset }: Pagination) {
    const where = { ownerId };
    return prisma.$transaction([
      prisma.project.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: limit, skip: offset }),
      prisma.project.count({ where }),
    ]);
  },

  findOwned(id: string, ownerId: string) {
    return prisma.project.findFirst({ where: { id, ownerId } });
  },

  updateOwned(id: string, ownerId: string, data: UpdateProjectInput) {
    return prisma.project.update({ where: { id, ownerId }, data });
  },

  async deleteOwned(id: string, ownerId: string): Promise<boolean> {
    const { count } = await prisma.project.deleteMany({ where: { id, ownerId } });
    return count > 0;
  },
};
