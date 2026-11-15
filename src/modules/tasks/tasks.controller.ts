import type { Request, Response } from 'express';
import { idParamSchema, paginated } from '../../utils/schemas.js';
import { projectIdParamSchema } from '../projects/projects.schemas.js';
import { createTaskSchema, listTasksQuerySchema, updateTaskSchema } from './tasks.schemas.js';
import * as tasksService from './tasks.service.js';

export async function create(req: Request, res: Response): Promise<void> {
  const { projectId } = projectIdParamSchema.parse(req.params);
  const input = createTaskSchema.parse(req.body);
  res.status(201).json({ data: await tasksService.createTask(req.userId, projectId, input) });
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = listTasksQuerySchema.parse(req.query);
  const [tasks, total] = await tasksService.listTasks(req.userId, query);
  res.json(paginated(tasks, total, query));
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await tasksService.getTask(req.userId, id) });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const input = updateTaskSchema.parse(req.body);
  res.json({ data: await tasksService.updateTask(req.userId, id, input) });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await tasksService.deleteTask(req.userId, id);
  res.status(204).end();
}
