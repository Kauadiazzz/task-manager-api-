import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma.js';

beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "Task", "Project", "User" CASCADE`;
});

afterAll(async () => {
  await prisma.$disconnect();
});
