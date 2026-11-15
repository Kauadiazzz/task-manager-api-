import type { RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/app-error.js';
import { verifyToken } from '../utils/jwt.js';

export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  const payload = header?.startsWith('Bearer ') ? verifyToken(header.slice(7)) : null;
  if (!payload) throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid token');

  // Rejects tokens of deleted users and tokens issued before the last password change.
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, tokenVersion: true },
  });
  if (!user || user.tokenVersion !== payload.tokenVersion) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid token');
  }

  req.userId = user.id;
  next();
};
