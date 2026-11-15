import { AppError } from '../../utils/app-error.js';
import { getProject } from '../projects/projects.service.js';
import { tasksRepository } from './tasks.repository.js';
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from './tasks.schemas.js';

const taskNotFound = () => new AppError(404, 'TASK_NOT_FOUND', 'Task not found');

export async function createTask(ownerId: string, projectId: string, input: CreateTaskInput) {
  await getProject(ownerId, projectId); // 404 unless the project belongs to the user
  return tasksRepository.create(projectId, input);
}

export function listTasks(ownerId: string, query: ListTasksQuery) {
  return tasksRepository.findManyByOwner(ownerId, query);
}

export async function getTask(ownerId: string, id: string) {
  const task = await tasksRepository.findOwned(id, ownerId);
  if (!task) throw taskNotFound();
  return task;
}

export async function updateTask(ownerId: string, id: string, input: UpdateTaskInput) {
  await getTask(ownerId, id);
  return tasksRepository.updateOwned(id, ownerId, input);
}

export async function deleteTask(ownerId: string, id: string): Promise<void> {
  if (!(await tasksRepository.deleteOwned(id, ownerId))) throw taskNotFound();
}
