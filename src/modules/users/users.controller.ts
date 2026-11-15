import type { Request, Response } from 'express';
import { changePasswordSchema, updateProfileSchema } from './users.schemas.js';
import * as usersService from './users.service.js';

export async function getMe(req: Request, res: Response): Promise<void> {
  res.json({ data: await usersService.getProfile(req.userId) });
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const input = updateProfileSchema.parse(req.body);
  res.json({ data: await usersService.updateProfile(req.userId, input) });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const input = changePasswordSchema.parse(req.body);
  await usersService.changePassword(req.userId, input);
  res.status(204).end();
}
