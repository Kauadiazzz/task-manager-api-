import { prisma } from '../../lib/prisma.js';

const withCredentials = { passwordHash: false, tokenVersion: false } as const;

export const usersRepository = {
  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findByEmailWithCredentials(email: string) {
    return prisma.user.findUnique({ where: { email }, omit: withCredentials });
  },

  findByIdWithCredentials(id: string) {
    return prisma.user.findUnique({ where: { id }, omit: withCredentials });
  },

  create(data: { name: string; email: string; passwordHash: string }) {
    return prisma.user.create({ data, omit: { tokenVersion: false } });
  },

  update(id: string, data: { name?: string; email?: string }) {
    return prisma.user.update({ where: { id }, data });
  },

  updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash, tokenVersion: { increment: 1 } } });
  },
};
