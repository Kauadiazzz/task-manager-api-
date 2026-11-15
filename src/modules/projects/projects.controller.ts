import type { Request, Response } from 'express';
import { idParamSchema, paginated, paginationSchema } from '../../utils/schemas.js';
import { createProjectSchema, updateProjectSchema } from './projects.schemas.js';
import * as projectsService from './projects.service.js';

export async function create(req: Request, res: Response): Promise<void> {
  const input = createProjectSchema.parse(req.body);
  res.status(201).json({ data: await projectsService.createProject(req.userId, input) });
}

export async function list(req: Request, res: Response): Promise<void> {
  const pagination = paginationSchema.parse(req.query);
  const [projects, total] = await projectsService.listProjects(req.userId, pagination);
  res.json(paginated(projects, total, pagination));
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await projectsService.getProject(req.userId, id) });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const input = updateProjectSchema.parse(req.body);
  res.json({ data: await projectsService.updateProject(req.userId, id, input) });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await projectsService.deleteProject(req.userId, id);
  res.status(204).end();
}
