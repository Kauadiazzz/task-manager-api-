import type { Request, Response } from 'express';
import { loginSchema, registerSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';

export async function register(req: Request, res: Response): Promise<void> {
  const input = registerSchema.parse(req.body);
  res.status(201).json({ data: await authService.register(input) });
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  res.json({ data: await authService.login(input) });
}
